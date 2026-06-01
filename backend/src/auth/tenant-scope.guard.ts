import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // You can use reflector to bypass this guard for certain fully-public routes if needed
    // const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);
    // if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      // Let AuthGuard handle unauthenticated users, or reject here if AuthGuard runs later
      return false;
    }

    // Super Admins usually have a tenant context when working within a tenant,
    // but if they are interacting globally, they might not. For the sake of this mandatory layer:
    if (user.isSuperAdmin && !user.organizationId) {
       // We can allow global operations if they are purely global, but 
       // the prompt specifies MANDATORY LAYER: "Every query MUST enforce WHERE tenant_id = :currentTenantId"
       // We will let them pass the guard, but DataScopeService will enforce passing an organizationId 
       // or adapting properly based on business logic. 
       // For now, if isolation is truly mandatory, we check it here.
    }

    if (!user.organizationId) {
      throw new ForbiddenException('Tenant context is required but missing.');
    }

    return true;
  }
}
