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
        organization: {
          select: { id: true, name: true, type: true },
        },
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
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

  async login(user: any) {
    // Flatten permissions array
    const permissions = user.role?.permissions?.map((rp: any) => rp.permission.action) || [];

    const jwtPayload = { 
      email: user.email, 
      sub: user.id, 
      organizationId: user.organizationId,
      roleId: user.roleId,
      isSuperAdmin: user.isSuperAdmin,
      permissions
    };

    return {
      access_token: this.jwtService.sign(jwtPayload),
      // Frontend stores this as the "current user". Keep it stable and explicit.
      user: {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        roleId: user.roleId,
        isSuperAdmin: user.isSuperAdmin,
        permissions,
        organization: user.organization ?? undefined,
      },
    };
  }
}
