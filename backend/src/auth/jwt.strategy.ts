import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'flashgard-super-secret-key-2026',
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
      permissions: payload.permissions || []
    };
  }
}
