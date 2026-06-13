import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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

    return {
      access_token: this.jwtService.sign(jwtPayload),
      // Frontend stores this as the "current user". 
      // Include accessible organizations for future UI switcher context.
      user: {
        userId: user.id,
        email: user.email,
        organizationId: activeOrg?.id,
        roleId: activeRole?.id,
        isSuperAdmin: user.isSuperAdmin,
        permissions,
        permissionScopes,
        organization: activeOrg ?? undefined,
        accessibleOrgs: user.organizations?.map((o: any) => ({
          organizationId: o.organizationId,
          roleId: o.roleId,
          isPrimary: o.isPrimary,
          organizationName: o.organization?.name
        })) || []
      },
    };
  }
}
