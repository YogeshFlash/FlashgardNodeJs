import { Controller, Post, Body, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
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
  async deviceLogin(@Body() body: { licenseKey: string }) {
    if (!body.licenseKey) {
      throw new UnauthorizedException('License key is required');
    }
    const result = await this.authService.loginDevice(body.licenseKey);
    if (!result) {
      throw new UnauthorizedException('Invalid device license key');
    }
    return result;
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
