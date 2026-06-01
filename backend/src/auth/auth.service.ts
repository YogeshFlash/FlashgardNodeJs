import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
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

    const activeRole = activeOrgLink?.role;
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
