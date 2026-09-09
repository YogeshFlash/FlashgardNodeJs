import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrgLicenseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { decryptLicenseKey } from '../utils/encryption';

function verifyAspNetIdentityV3Hash(hashedPassword: string, password: string): boolean {
    try {
        const decoded = Buffer.from(hashedPassword, 'base64');
        if (decoded.length === 0 || decoded[0] !== 0x01) {
            return false;
        }
        const prf = decoded.readUInt32BE(1);
        const iterCount = decoded.readUInt32BE(5);
        const saltLength = decoded.readUInt32BE(9);
        let hashAlgorithm = '';
        if (prf === 0) hashAlgorithm = 'sha1';
        else if (prf === 1) hashAlgorithm = 'sha256';
        else if (prf === 2) hashAlgorithm = 'sha512';
        else return false;

        const salt = decoded.subarray(13, 13 + saltLength);
        const expectedSubkey = decoded.subarray(13 + saltLength);
        const actualSubkey = crypto.pbkdf2Sync(password, salt, iterCount, expectedSubkey.length, hashAlgorithm);

        return crypto.timingSafeEqual(expectedSubkey, actualSubkey);
    } catch (err) {
        return false;
    }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        },
        organizations: {
          include: {
            organization: {
              select: { id: true, name: true, organizationTypeId: true, organizationType: true },
            },
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        userPermissions: {
          include: { permission: true }
        },
        teamMembers: true
      }
    });
    
    if (user && user.isActive) {
      let isMatch = false;
      let needsUpgrade = false;

      // Check if it's a legacy ASP.NET Identity V3 hash (starts with AQAAAA)
      if (user.passwordHash && user.passwordHash.startsWith('AQAAAA')) {
        isMatch = verifyAspNetIdentityV3Hash(user.passwordHash, pass);
        if (isMatch) {
          needsUpgrade = true;
        }
      } else {
        isMatch = await bcrypt.compare(pass, user.passwordHash);
      }

      if (isMatch) {
        if (needsUpgrade) {
          // Transparently upgrade the password hash to bcrypt
          const newHash = await bcrypt.hash(pass, 10);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
          });
        }
        
        // Strip out the passwordHash before returning the object
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async getUserWithOrgs(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        },
        organizations: {
          include: {
            organization: {
              select: { id: true, name: true, organizationTypeId: true, organizationType: true },
            },
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        userPermissions: {
          include: { permission: true }
        },
        teamMembers: true
      }
    });
    
    if (user && user.isActive) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, requestedOrgId?: string) {
    // Determine the active organization context
    let activeOrgLink;
    
    if (requestedOrgId) {
      activeOrgLink = user.organizations?.find((org: any) => org.organizationId === requestedOrgId);
      if (!activeOrgLink && !user.isSuperAdmin) {
        throw new UnauthorizedException('You do not have access to the requested organization.');
      }
    } 
    
    if (!activeOrgLink) {
      // Fallback to primary or first available if no explicit request
      activeOrgLink = user.organizations?.find((org: any) => org.isPrimary) || user.organizations?.[0];
    }

    const activeRole = activeOrgLink?.role || user.role;
    const activeOrg = activeOrgLink?.organization;

    // Load user permission overrides for the ACTIVE organization
    const orgUserPermissions = user.userPermissions?.filter((up: any) => up.organizationId === activeOrg?.id) || [];
    
    // Evaluate combined scopes
    const finalPermissions = new Set<string>();
    const permissionScopes: Record<string, string> = {};

    // 1. Role-based fallback
    if (activeRole && activeRole.permissions) {
      activeRole.permissions.forEach((rp: any) => {
         const action = rp.permission.action;
         finalPermissions.add(action);
         permissionScopes[action] = rp.dataScope || 'own';
      });
    }

    // 2. Explicit grants
    orgUserPermissions.filter((up: any) => up.effect === 'grant').forEach((up: any) => {
       const action = up.permission.action;
       finalPermissions.add(action);
       permissionScopes[action] = up.dataScope || permissionScopes[action] || 'own';
    });

    // 3. Explicit denies
    orgUserPermissions.filter((up: any) => up.effect === 'deny').forEach((up: any) => {
       const action = up.permission.action;
       finalPermissions.delete(action);
       delete permissionScopes[action];
    });

    const permissions = Array.from(finalPermissions);
    const teamIds = user.teamMembers?.map((tm: any) => tm.teamId) || [];

    const jwtPayload = { 
      email: user.email, 
      sub: user.id, 
      organizationId: activeOrg?.id,
      roleId: activeRole?.id,
      isSuperAdmin: user.isSuperAdmin,
      permissions,
      permissionScopes,
      teamIds
    };

    let licenseKey: string | null = null;
    if (activeOrg) {
      let activeLicense = await this.prisma.orgLicense.findFirst({
        where: {
          tenantId: activeOrg.id,
          status: 'ACTIVE',
        },
        select: {
          key: true,
        },
      });

      if (!activeLicense) {
        // Automatically activate an AVAILABLE license assigned to this organization
        const availableLicense = await this.prisma.orgLicense.findFirst({
          where: {
            tenantId: activeOrg.id,
            status: 'AVAILABLE',
          },
        });

        if (availableLicense) {
          const activatedLicense = await this.prisma.orgLicense.update({
            where: { id: availableLicense.id },
            data: {
              status: 'ACTIVE',
              activatedAt: new Date(),
            },
            select: {
              key: true,
              tenantId: true,
              ownerId: true,
            },
          });
          activeLicense = activatedLicense;

          if (activatedLicense.tenantId) {
            await this.ensureEntityWallet(activatedLicense.tenantId);
          }
          if (activatedLicense.ownerId && activatedLicense.ownerId !== activatedLicense.tenantId) {
            await this.ensureEntityWallet(activatedLicense.ownerId);
          }
        }
      }

      licenseKey = activeLicense?.key ? decryptLicenseKey(activeLicense.key) : null;
    }

    return {
      access_token: this.jwtService.sign(jwtPayload),
      // Frontend stores this as the "current user". 
      // Include accessible organizations for future UI switcher context.
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: activeOrg?.id,
        roleId: activeRole?.id,
        isSuperAdmin: user.isSuperAdmin,
        permissions,
        permissionScopes,
        organization: activeOrg ?? undefined,
        licenseKey: licenseKey,
        accessibleOrgs: user.organizations?.map((o: any) => ({
          organizationId: o.organizationId,
          roleId: o.roleId,
          isPrimary: o.isPrimary,
          organizationName: o.organization?.name
        })) || []
      },
    };
  }

  async loginDevice(licenseKey?: string, orgId?: string, email?: string) {
    let cleanKey = (licenseKey || '').trim();
    if (cleanKey.toUpperCase() === 'PENDING') {
      cleanKey = '';
    }

    let matchedOrgId: string | null = null;
    let matchedOrg: any = null;

    // 1. Check plotter table by licenseKey
    if (cleanKey) {
      const plotter = await (this.prisma as any).plotter.findFirst({
        where: {
          licenseKey: cleanKey,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
        }
      });

      if (plotter && plotter.organizationId) {
        matchedOrgId = plotter.organizationId;
        matchedOrg = plotter.organization;
      }

      // 2. Check OrgLicense table (both encrypted and decrypted match)
      if (!matchedOrgId) {
        const allLicenses = await this.prisma.orgLicense.findMany({
          where: {
            status: { in: ['ACTIVE', 'AVAILABLE'] as OrgLicenseStatus[] },
          },
        });

        for (const lic of allLicenses) {
          let decKey = '';
          try {
            decKey = decryptLicenseKey(lic.key);
          } catch {
            decKey = lic.key;
          }

          if (
            decKey.trim().toUpperCase() === cleanKey.toUpperCase() ||
            lic.key.trim().toUpperCase() === cleanKey.toUpperCase()
          ) {
            matchedOrgId = lic.tenantId || lic.ownerId;
            break;
          }
        }
      }
    }

    // 3. Check by orgId if not matched yet
    if (!matchedOrgId && orgId && orgId.trim()) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId.trim() },
      });
      if (org) {
        matchedOrgId = org.id;
        matchedOrg = org;
      }
    }

    // 4. Check by email if not matched yet
    if (!matchedOrgId && email && email.trim()) {
      const user = await this.prisma.user.findFirst({
        where: { email: email.trim() },
        include: {
          organizations: {
            include: { organization: true }
          }
        }
      });
      if (user) {
        matchedOrgId = user.organizations?.[0]?.organizationId || user.organizationId;
        matchedOrg = user.organizations?.[0]?.organization;
      }
    }

    if (!matchedOrgId) return null;

    if (!matchedOrg) {
      matchedOrg = await this.prisma.organization.findUnique({
        where: { id: matchedOrgId },
      });
    }

    // Find a user belonging to the matched organization
    const userOrgLink = await (this.prisma as any).userOrganization.findFirst({
      where: {
        organizationId: matchedOrgId,
      },
      include: {
        user: true,
      }
    });

    let user = userOrgLink?.user;
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          organizationId: matchedOrgId,
          isActive: true,
        }
      });
    }

    if (!user) {
      // Find direct user or contact on org
      const orgWithUsers = await this.prisma.organization.findUnique({
        where: { id: matchedOrgId },
        include: {
          users: true,
          contacts: true,
        }
      });
      if (orgWithUsers?.users?.[0]) {
        user = orgWithUsers.users[0];
      } else {
        // Create synthetic device user session
        user = {
          id: matchedOrgId,
          email: orgWithUsers?.contacts?.[0]?.email || `device-${matchedOrgId.substring(0, 8)}@flashgard.local`,
          firstName: matchedOrg?.name || 'Organization',
          lastName: 'Device',
          isSuperAdmin: false,
          isActive: true,
        };
      }
    }

    // Retrieve active license key if available for display
    let orgLicenseKey = cleanKey;
    if (!orgLicenseKey || orgLicenseKey === 'PENDING') {
      const existingLic = await this.prisma.orgLicense.findFirst({
        where: {
          OR: [
            { tenantId: matchedOrgId },
            { ownerId: matchedOrgId },
          ],
          status: { in: ['ACTIVE', 'AVAILABLE'] as OrgLicenseStatus[] }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (existingLic) {
        try {
          orgLicenseKey = decryptLicenseKey(existingLic.key);
        } catch {
          orgLicenseKey = existingLic.key;
        }
      }
    }

    const permissions = ['catalog:read', 'cuts:write', 'settings:read', 'inventory:read', 'models:read'];
    const permissionScopes = {
      'catalog:read': 'all',
      'cuts:write': 'all',
      'settings:read': 'all',
      'inventory:read': 'all',
      'models:read': 'all',
    };

    const jwtPayload = {
      email: user.email,
      sub: user.id,
      organizationId: matchedOrgId,
      isSuperAdmin: user.isSuperAdmin || false,
      permissions,
      permissionScopes,
      teamIds: [],
    };

    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: matchedOrgId,
        isSuperAdmin: user.isSuperAdmin || false,
        permissions,
        permissionScopes,
        organization: matchedOrg ?? undefined,
        licenseKey: orgLicenseKey || undefined,
        accessibleOrgs: matchedOrg ? [{
          organizationId: matchedOrgId,
          roleId: null,
          isPrimary: true,
          organizationName: matchedOrg.name,
        }] : [],
        isDevice: true,
      }
    };
  }

  async getProfile(userId: string, organizationId?: string) {
    let matchedOrgId = organizationId;
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
            role: true,
          }
        },
        role: true,
      }
    });

    if (!matchedOrgId && user) {
      matchedOrgId = user.organizations?.[0]?.organizationId || user.organizationId || undefined;
    }

    let org: any = null;
    if (matchedOrgId) {
      org = await this.prisma.organization.findUnique({
        where: { id: matchedOrgId },
        include: {
          organizationType: true,
          tenantWallets: true,
        }
      });
    }

    let licenseKey: string | null = null;
    if (matchedOrgId) {
      const existingLic = await this.prisma.orgLicense.findFirst({
        where: {
          OR: [
            { tenantId: matchedOrgId },
            { ownerId: matchedOrgId },
          ],
          status: { in: ['ACTIVE', 'AVAILABLE'] as OrgLicenseStatus[] }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (existingLic) {
        try {
          licenseKey = decryptLicenseKey(existingLic.key);
        } catch {
          licenseKey = existingLic.key;
        }
      }
    }

    const wallet = org?.tenantWallets?.[0];

    return {
      userId: user?.id || userId,
      email: user?.email || '',
      firstName: user?.firstName || (org?.name ? org.name : 'User'),
      lastName: user?.lastName || '',
      organizationId: matchedOrgId,
      isSuperAdmin: user?.isSuperAdmin || false,
      organization: org ? {
        id: org.id,
        name: org.name,
        type: org.organizationType?.name || 'organization',
      } : undefined,
      licenseKey: licenseKey || undefined,
      credits: wallet?.balance ?? 0,
    };
  }

  private async ensureEntityWallet(orgId: string) {
    if (!orgId) return;
    const wallet = await this.prisma.entityWallet.findFirst({
      where: {
        OR: [
          { orgId },
          { tenantId: orgId }
        ]
      }
    });

    if (!wallet) {
      await this.prisma.entityWallet.create({
        data: {
          orgId,
          tenantId: orgId,
          balance: 0,
          totalCredits: 0,
          usedCredits: 0
        }
      });
    }
  }
}
