import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CONFIG } from '../app-config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: CONFIG.BACKEND.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // This payload is the decoded JWT.
    // What we return here gets injected into the `request.user` object of route handlers.
    return { 
      userId: payload.sub, 
      email: payload.email,
      organizationId: payload.organizationId,
      roleId: payload.roleId,
      isSuperAdmin: payload.isSuperAdmin,
      permissions: payload.permissions || [],
      permissionScopes: payload.permissionScopes || {},
      teamIds: payload.teamIds || []
    };
  }
}
