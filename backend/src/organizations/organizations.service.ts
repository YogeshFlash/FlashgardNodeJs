import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptLicenseKey, decryptLicenseKey } from '../utils/encryption';
import { OrgLicenseStatus, OrgLicenseType, CreditPlanType, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  async getDescendantOrgIds(rootOrgId: string): Promise<string[]> {
    if (!rootOrgId) return [];
    
    const allOrgIds = new Set<string>();
    allOrgIds.add(rootOrgId);
    
    let currentLevelIds = [rootOrgId];
    
    while (currentLevelIds.length > 0) {
      const children = await this.prisma.organization.findMany({
        where: { parentId: { in: currentLevelIds } },
        select: { id: true },
      });
      
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) break;
      
      childIds.forEach(id => allOrgIds.add(id));
      currentLevelIds = childIds;
    }
    
    return Array.from(allOrgIds);
  }

  
  async canAccessOrg(user: any, targetOrgId: string): Promise<boolean> {
    if (user.isSuperAdmin) return true;
    if (!user.organizationId) return false;
    if (user.organizationId === targetOrgId) return true;
    
    let currentOrgId: string | null = targetOrgId;
    while (currentOrgId) {
      const parentOrg: any = await this.prisma.organization.findUnique({
        where: { id: currentOrgId },
        select: { parentId: true }
      });
      if (!parentOrg || !parentOrg.parentId) return false;
      if (parentOrg.parentId === user.organizationId) return true;
      currentOrgId = parentOrg.parentId;
    }
    return false;
  }

  async getAllowedOrgIds(user: any): Promise<string[] | null> {
    if (user.isSuperAdmin) return null; // null means all access
    if (!user.organizationId) return []; // No org access
    return this.getDescendantOrgIds(user.organizationId);
  }

  async create(data: any, currentUser: any) {
    try {
      const { name, isActive, parentId, type } = data;
      let { organizationTypeId } = data;
      
      if (type && !organizationTypeId) {
        const orgType = await this.prisma.organizationType.findFirst({ 
          where: { name: { equals: type, mode: 'insensitive' } } 
        });
        if (orgType) organizationTypeId = orgType.id;
      }
      
      this.logger.log(`Creating org: name=${name}, typeId=${organizationTypeId} by user=${currentUser.email}`);
      
      const allowedOrgIds = await this.getAllowedOrgIds(currentUser);

      // Enforce hierarchy for non-super-admins:
      // - Cannot create a root org (parentId null/undefined).
      // - Can only create under their org tree (default parent to their org).
      // - Cannot create internal org types.
      let effectiveParentId: string | null = parentId ?? null;
      if (allowedOrgIds !== null) {
        // Fetch organization type to check for 'parent' restriction if needed
        const orgType = await this.prisma.organizationType.findUnique({ where: { id: organizationTypeId } });
        if (orgType?.name === 'parent') {
          throw new ForbiddenException('You do not have permission to create parent organizations.');
        }

        if (!currentUser.organizationId) {
          throw new ForbiddenException('You do not have an organization assigned.');
        }

        if (!effectiveParentId) {
          effectiveParentId = currentUser.organizationId;
        }

        if (!effectiveParentId || !allowedOrgIds.includes(effectiveParentId)) {
          throw new ForbiddenException('You do not have permission to create an organization under the specified parent.');
        }
      }
      
      const result = await this.prisma.organization.create({
        data: { name, organizationTypeId, isActive: isActive ?? true, parentId: effectiveParentId },
      });
      this.logger.log(`Created org id=${result.id}`);
      return result;
    } catch (e: any) {
      this.logger.error(`Create org failed: ${e.message}`, e.stack);
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e.message);
    }
  }

  async findAll(search?: string, currentUser?: any, includeDeleted?: boolean) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    
    const whereClause: any = {};
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }
    
    if (allowedOrgIds !== null) {
      whereClause.id = { in: allowedOrgIds };
    }

    // Always return all orgs including deleted (UI handles visual distinction)

    return this.prisma.organization.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        organizationType: true,
        tenantWallets: true,
        users: { select: { id: true, firstName: true, lastName: true, email: true } },
        addresses: true,
        contacts: true
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
      throw new InternalServerErrorException('You do not have permission to access this organization.');
    }

    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        organizationType: true,
        contacts: true,
        users: { include: { role: true } },
        userOrganizations: {
          include: {
            user: true
          }
        },
        addresses: true,
        roles: true,
        tenantWallets: true,
      },
    });
  }

  async update(id: string, data: any, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
       throw new InternalServerErrorException('You do not have permission to update this organization.');
    }

    const { name, isActive, parentId, type } = data;
    let { organizationTypeId } = data;

    if (type) {
      // Find the organization type ID using case-insensitive search
      const orgType = await this.prisma.organizationType.findFirst({ 
        where: { name: { equals: type, mode: 'insensitive' } } 
      });
      if (orgType) {
        organizationTypeId = orgType.id;
      }
    }
    
    // Non-super-admins cannot move an org to the root.
    if (allowedOrgIds !== null && parentId === null) {
      throw new ForbiddenException('You do not have permission to move an organization to the root level.');
    }

    if (allowedOrgIds !== null && parentId && !allowedOrgIds.includes(parentId)) {
      throw new InternalServerErrorException('You do not have permission to move to the specified parent organization.');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { name, organizationTypeId, isActive, parentId: parentId ? parentId : null },
    });
  }

  async remove(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
       throw new InternalServerErrorException('You do not have permission to delete this organization.');
    }
    return this.prisma.organization.update({ 
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  private generateProfessionalKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, I, 1, 0 to avoid confusion
    const segment = () => Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `FLSHG-${segment()}-${segment()}-${segment()}-${segment()}`;
  }

  async onboardRetailer(data: any, currentUser: any) {
    try {
      const {
        name,
        parentId,
        organizationTypeId,
        contact,
        address,
        user,
        plotter,
        starterCredits,
        validityDays,
      } = data;

      if (!name || !name.trim()) {
        throw new BadRequestException('Store / Organization name is required');
      }
      if (!user?.email || !user.email.trim()) {
        throw new BadRequestException('Primary admin user email is required');
      }

      const allowedOrgIds = await this.getAllowedOrgIds(currentUser);
      let effectiveParentId: string | null = parentId ?? null;

      if (allowedOrgIds !== null) {
        if (!currentUser.organizationId) {
          throw new ForbiddenException('You do not have an organization assigned.');
        }
        if (!effectiveParentId) {
          effectiveParentId = currentUser.organizationId;
        }
        if (!effectiveParentId || !allowedOrgIds.includes(effectiveParentId)) {
          throw new ForbiddenException('You do not have permission to onboard a retailer under the specified parent.');
        }
      }

      // Check if user email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: user.email.trim().toLowerCase() },
      });
      if (existingUser) {
        throw new BadRequestException(`A user with email ${user.email} already exists.`);
      }

      // Auto resolve Organization Type (fallback to 'retailer' or 'dealer')
      let effectiveOrgTypeId = organizationTypeId;
      if (!effectiveOrgTypeId) {
        const orgType = await this.prisma.organizationType.findFirst({
          where: {
            OR: [
              { name: { equals: 'retailer', mode: 'insensitive' } },
              { name: { equals: 'dealer', mode: 'insensitive' } },
              { name: { equals: 'store', mode: 'insensitive' } },
            ],
          },
        });
        effectiveOrgTypeId = orgType?.id;
      }

      // Temporary password generation
      const rawPassword = user.password && user.password.trim().length >= 6
        ? user.password.trim()
        : `Flash@${Math.floor(1000 + Math.random() * 9000)}`;

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      // Find appropriate default role for Retailer Admin
      let defaultRole = await this.prisma.role.findFirst({
        where: {
          OR: [
            { name: { equals: 'Retailer Admin', mode: 'insensitive' } },
            { name: { equals: 'Dealer Admin', mode: 'insensitive' } },
            { name: { equals: 'Store Admin', mode: 'insensitive' } },
          ],
        },
      });

      if (!defaultRole) {
        // Fallback to any non-super admin role
        defaultRole = await this.prisma.role.findFirst({
          where: { isSystemRole: false },
        }) || await this.prisma.role.findFirst();
      }

      const rawLicenseKey = this.generateProfessionalKey();
      const encryptedLicenseKey = encryptLicenseKey(rawLicenseKey);
      const totalCredits = starterCredits && !isNaN(Number(starterCredits)) ? Number(starterCredits) : 50;
      const licenseDays = validityDays && !isNaN(Number(validityDays)) ? Number(validityDays) : 365;

      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + licenseDays * 24 * 60 * 60 * 1000);

      // Execute entire onboarding atomically
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create Organization
        const org = await tx.organization.create({
          data: {
            name: name.trim(),
            organizationTypeId: effectiveOrgTypeId,
            parentId: effectiveParentId,
            isActive: true,
          },
        });

        // 2. Create Contact
        let createdContact: any = null;
        if (contact && (contact.firstName || contact.email || contact.phone)) {
          createdContact = await tx.contact.create({
            data: {
              organizationId: org.id,
              firstName: contact.firstName || user.firstName || 'Store',
              lastName: contact.lastName || user.lastName || 'Manager',
              email: contact.email || user.email,
              phone: contact.phone || null,
              jobTitle: contact.jobTitle || 'Store Owner',
              isPrimary: true,
            },
          });
        }

        // 3. Create Address
        let createdAddress: any = null;
        if (address && (address.streetLine1 || address.city || address.postalCode)) {
          createdAddress = await tx.address.create({
            data: {
              organizationId: org.id,
              streetLine1: address.streetLine1 || 'N/A',
              streetLine2: address.streetLine2 || null,
              city: address.city || 'N/A',
              state: address.state || 'N/A',
              postalCode: address.postalCode || 'N/A',
              country: address.country || 'India',
              isPrimary: true,
            },
          });
        }

        // 4. Create Admin User
        const newUser = await tx.user.create({
          data: {
            organizationId: org.id,
            contactId: createdContact?.id || null,
            roleId: defaultRole?.id || null,
            email: user.email.trim().toLowerCase(),
            passwordHash,
            firstName: user.firstName || contact?.firstName || 'Store',
            lastName: user.lastName || contact?.lastName || 'Admin',
            isActive: true,
            isSuperAdmin: false,
          },
        });

        // 5. Link User to Organization
        if (defaultRole) {
          await tx.userOrganization.create({
            data: {
              userId: newUser.id,
              organizationId: org.id,
              roleId: defaultRole.id,
              isPrimary: true,
            },
          });
        }

        // 6. Create License Batch & License
        const dateStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
        const orgPart = org.name.substring(0, 3).toUpperCase();
        const batchCode = `ONBOARD-${dateStr}-${orgPart}-${Date.now().toString().slice(-4)}`;

        const batch = await tx.orgLicenseBatch.create({
          data: {
            batchCode,
            licenseType: OrgLicenseType.PRO,
            totalCount: 1,
            createdBy: currentUser.userId || currentUser.id || newUser.id,
            tenantId: org.id,
          },
        });

        const license = await tx.orgLicense.create({
          data: {
            key: encryptedLicenseKey,
            batchId: batch.id,
            ownerId: effectiveParentId || org.id,
            tenantId: org.id,
            status: OrgLicenseStatus.AVAILABLE,
            startDate,
            expiryDate,
            licenseName: `${org.name} Starter License`,
          },
        });

        // 7. Create/Allocate Plotter Device if specified
        let createdPlotter: any = null;
        if (plotter && plotter.plotterMasterId) {
          createdPlotter = await tx.plotter.create({
            data: {
              name: plotter.name || `${org.name} Cutter`,
              serialNumber: plotter.serialNumber?.trim() || null,
              licenseKey: encryptedLicenseKey,
              plotterMasterId: plotter.plotterMasterId,
              organizationId: org.id,
              status: 'ACTIVE',
              description: plotter.description || 'Assigned during retailer onboarding',
            },
            include: {
              plotterMaster: true,
            },
          });
        }

        // 8. Provision Starter Credits & Initialize Entity Wallet
        const wallet = await tx.entityWallet.create({
          data: {
            orgId: org.id,
            tenantId: org.id,
            balance: totalCredits,
            totalCredits: totalCredits,
            usedCredits: 0,
            lastRechargedAt: new Date(),
          },
        });

        if (totalCredits > 0) {
          await tx.cutCredit.create({
            data: {
              ownerId: effectiveParentId || org.id,
              tenantId: org.id,
              licenseId: license.id,
              credits: totalCredits,
              planType: CreditPlanType.USAGE,
              validityDays: licenseDays,
              isOffer: true,
              notes: 'Onboarding Starter Credit Pack',
              startDate,
              endDate: expiryDate,
            },
          });

          await tx.creditTransaction.create({
            data: {
              walletId: wallet.id,
              tenantId: org.id,
              amount: totalCredits,
              type: TransactionType.CREDIT,
              isOffer: true,
              source: 'ONBOARDING_GIFT',
              notes: `Welcome gift: ${totalCredits} free starter cuts`,
            },
          });
        }

        return {
          org,
          createdContact,
          createdAddress,
          newUser,
          license,
          createdPlotter,
          wallet,
        };
      });

      // Construct Welcome QR Code Payload
      const qrPayload = JSON.stringify({
        version: 1,
        type: 'FLASHGARD_ONBOARDING',
        orgId: result.org.id,
        orgName: result.org.name,
        email: result.newUser.email,
        temporaryPassword: rawPassword,
        licenseKey: rawLicenseKey,
        serialNumber: result.createdPlotter?.serialNumber || '',
        plotterModel: result.createdPlotter?.plotterMaster?.plotterName || 'Standard Cutter',
        credits: totalCredits,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Retailer onboarded successfully',
        organization: result.org,
        contact: result.createdContact,
        address: result.createdAddress,
        user: {
          id: result.newUser.id,
          email: result.newUser.email,
          firstName: result.newUser.firstName,
          lastName: result.newUser.lastName,
          temporaryPassword: rawPassword,
        },
        plotter: result.createdPlotter,
        license: {
          id: result.license.id,
          key: rawLicenseKey,
          status: result.license.status,
          expiryDate: result.license.expiryDate,
        },
        wallet: {
          balance: totalCredits,
        },
        qrPayload,
      };
    } catch (e: any) {
      this.logger.error(`Retailer onboarding failed: ${e.message}`, e.stack);
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e.message);
    }
  }

  async getWelcomeKit(orgId: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(orgId)) {
      throw new ForbiddenException('You do not have permission to view this onboarding kit.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        organizationType: true,
        parent: true,
        contacts: true,
        addresses: true,
        users: { include: { role: true } },
        userOrganizations: { include: { user: { include: { role: true } } } },
        tenantWallets: true,
        plotters: { include: { plotterMaster: true } },
      }
    });

    if (!org) {
      throw new BadRequestException('Organization not found.');
    }

    // Get primary user
    const primaryUserOrg = org.userOrganizations.find(uo => uo.isPrimary) || org.userOrganizations[0];
    const primaryUser = primaryUserOrg?.user || org.users[0] || null;

    // Get contact & address
    const contact = org.contacts[0] || null;
    const address = org.addresses[0] || null;

    // Get plotter
    const plotter = org.plotters[0] || null;

    // Get licenses (active or issued to this tenant)
    const licenses = await this.prisma.orgLicense.findMany({
      where: {
        OR: [
          { tenantId: orgId },
          { ownerId: orgId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const latestLicense = licenses[0] || null;
    let rawLicenseKey = 'PENDING';
    if (latestLicense) {
      try {
        rawLicenseKey = decryptLicenseKey(latestLicense.key);
      } catch {
        rawLicenseKey = latestLicense.key;
      }
    }

    // Get wallet
    const wallet = org.tenantWallets[0] || null;

    const qrPayload = JSON.stringify({
      version: 1,
      type: 'FLASHGARD_ONBOARDING',
      orgId: org.id,
      orgName: org.name,
      email: primaryUser?.email || contact?.email || '',
      temporaryPassword: '',
      licenseKey: rawLicenseKey,
      serialNumber: plotter?.serialNumber || '',
      plotterModel: plotter?.plotterMaster?.plotterName || 'Standard Cutter',
      credits: wallet?.balance ?? 0,
      createdAt: org.createdAt.toISOString(),
    });

    return {
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        type: org.organizationType?.name || (org as any).type || 'organization',
        createdAt: org.createdAt,
        parent: org.parent ? { id: org.parent.id, name: org.parent.name } : null,
      },
      contact: contact ? {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      } : null,
      address: address ? {
        street: address.streetLine1 || (address as any).street || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      } : null,
      user: primaryUser ? {
        id: primaryUser.id,
        email: primaryUser.email,
        firstName: primaryUser.firstName,
        lastName: primaryUser.lastName,
        temporaryPassword: '',
      } : null,
      plotter: plotter ? {
        id: plotter.id,
        name: plotter.name,
        serialNumber: plotter.serialNumber,
        macAddress: plotter.macAddress,
        plotterMaster: plotter.plotterMaster,
      } : null,
      license: latestLicense ? {
        id: latestLicense.id,
        key: rawLicenseKey,
        status: latestLicense.status,
        expiryDate: latestLicense.expiryDate,
      } : null,
      wallet: {
        balance: wallet?.balance ?? 0,
        totalCredits: wallet?.totalCredits ?? 0,
        usedCredits: wallet?.usedCredits ?? 0,
      },
      qrPayload,
    };
  }
}

