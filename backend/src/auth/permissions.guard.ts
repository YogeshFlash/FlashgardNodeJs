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

    // Super Admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    const userPermissions = user.permissions || [];
    
    const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to perform this action.');
    }

    return true;
  }
}
