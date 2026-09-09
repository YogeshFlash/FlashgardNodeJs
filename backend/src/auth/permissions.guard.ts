import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // No permissions required for this route
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Safety check if AuthGuard didn't run or user is missing
    if (!user) {
      return false; 
    }

    const userPermissions = user.permissions || [];
    
    // Super Admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    // Map tab-level permissions to backend endpoint requirements
    const expandedUserPerms = new Set<string>(userPermissions);

    if (userPermissions.includes('inventory:read') || userPermissions.includes('inventory:write')) {
      expandedUserPerms.add('inventory:read');
      expandedUserPerms.add('inventory:write');
    }

    if (userPermissions.includes('inventory_dispatch:read') || userPermissions.includes('dispatch:read')) {
      expandedUserPerms.add('inventory:read');
      expandedUserPerms.add('inventory_dispatch:read');
      expandedUserPerms.add('dispatch:read');
    }
    if (userPermissions.includes('inventory_dispatch:write') || userPermissions.includes('dispatch:write')) {
      expandedUserPerms.add('inventory:write');
      expandedUserPerms.add('inventory_dispatch:write');
      expandedUserPerms.add('dispatch:write');
    }

    if (userPermissions.includes('inventory_inward:read') || userPermissions.includes('inward:read')) {
      expandedUserPerms.add('inventory:read');
      expandedUserPerms.add('inventory_inward:read');
      expandedUserPerms.add('inward:read');
    }
    if (userPermissions.includes('inventory_inward:write') || userPermissions.includes('inward:write')) {
      expandedUserPerms.add('inventory:write');
      expandedUserPerms.add('inventory_inward:write');
      expandedUserPerms.add('inward:write');
    }

    if (userPermissions.includes('inventory_packaged:read') || userPermissions.includes('inventory_batches:read')) {
      expandedUserPerms.add('inventory:read');
    }
    if (userPermissions.includes('inventory_packaged:write') || userPermissions.includes('inventory_batches:write')) {
      expandedUserPerms.add('inventory:write');
    }
    if (userPermissions.includes('inventory_workorders:read') || userPermissions.includes('production:read')) {
      expandedUserPerms.add('inventory:read');
    }
    if (userPermissions.includes('inventory_workorders:write') || userPermissions.includes('production:write')) {
      expandedUserPerms.add('inventory:write');
    }
    if (userPermissions.includes('inventory_filmtypes:read') || userPermissions.includes('catalog:read')) {
      expandedUserPerms.add('inventory:read');
    }
    if (userPermissions.includes('inventory_filmtypes:write') || userPermissions.includes('catalog:write')) {
      expandedUserPerms.add('inventory:write');
    }

    const hasPermission = requiredPermissions.every(permission => expandedUserPerms.has(permission));

    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to perform this action.');
    }

    return true;
  }
}
