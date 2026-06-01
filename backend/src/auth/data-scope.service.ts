import { Injectable, ForbiddenException } from '@nestjs/common';

export type ActionDataScope = 'own' | 'team' | 'all';

export interface DataScopeOptions {
  userIdField?: string;
  teamIdField?: string;
}

@Injectable()
export class DataScopeService {
  /**
   * Generates a Prisma specific 'where' clause for the current tenant and scope.
   * 
   * @param currentUser    The user payload from the JWT
   * @param requiredAction The permission action being verified (e.g. 'leads:read')
   * @param options        Optional overrides for field names to match Prisma schema
   * @returns Prisma specific where clause object
   */
  getPrismaFilter(currentUser: any, requiredAction: string, options?: DataScopeOptions) {
    if (!currentUser || !currentUser.organizationId) {
      throw new ForbiddenException('Tenant context is missing or invalid.');
    }

    const { organizationId, userId, teamIds = [], permissionScopes = {}, isSuperAdmin } = currentUser;
    const baseFilter = { organizationId };

    if (isSuperAdmin) {
      // Super admins always have access to everything IN the tenant boundary
      return baseFilter;
    }

    // Determine scope
    let resolvedScope: ActionDataScope = 'own'; // default fallback securely
    
    if (permissionScopes[requiredAction]) {
      resolvedScope = permissionScopes[requiredAction] as ActionDataScope;
    }

    const userIdField = options?.userIdField || 'userId';
    const teamIdField = options?.teamIdField || 'teamId';

    switch (resolvedScope) {
      case 'all':
        return baseFilter;
        
      case 'team':
        return {
          ...baseFilter,
          OR: [
            { [userIdField]: userId },
            { [teamIdField]: { in: teamIds } }
          ]
        };

      case 'own':
      default:
        return {
          ...baseFilter,
          [userIdField]: userId
        };
    }
  }
}
