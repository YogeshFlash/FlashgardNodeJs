import { Controller, Get, Post, Body, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    // Note: For a production app, use LocalAuthGuard with Passport
    // Doing direct validation here for simplicity since we don't have separate username fields
    const user = await this.authService.validateUser(body.email, body.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return this.authService.login(user, body.organizationId);
  }

  @Public()
  @Post('device-login')
  async deviceLogin(@Body() body: { licenseKey?: string; orgId?: string; email?: string }) {
    if (!body.licenseKey && !body.orgId && !body.email) {
      throw new UnauthorizedException('License key or Organization identifier is required');
    }
    const result = await this.authService.loginDevice(body.licenseKey, body.orgId, body.email);
    if (!result) {
      throw new UnauthorizedException('Invalid device license key or welcome pass');
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    const orgId = req.user.organizationId;
    return this.authService.getProfile(userId, orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-org')
  async switchOrg(@Request() req: any, @Body() body: { organizationId: string }) {
    if (!body.organizationId) {
       throw new UnauthorizedException('Organization ID is required');
    }

    const user = await this.authService.getUserWithOrgs(req.user.userId);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.authService.login(user, body.organizationId);
  }
}
