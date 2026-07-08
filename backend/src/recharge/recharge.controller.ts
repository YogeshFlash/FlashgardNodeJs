import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Headers, BadRequestException } from '@nestjs/common';
import { RechargeService } from './recharge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('recharge')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  // ─── Public/User: Get active packages ───────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('packages')
  async getPackages() {
    return this.rechargeService.getPackages();
  }

  // ─── Admin: Manage packages ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('packages/all')
  async getAllPackages(@Request() req: any) {
    if (!req.user?.isSuperAdmin) throw new BadRequestException('Super admin only');
    return this.rechargeService.getAllPackages();
  }

  @UseGuards(JwtAuthGuard)
  @Post('packages')
  async createPackage(@Request() req: any, @Body() body: any) {
    if (!req.user?.isSuperAdmin) throw new BadRequestException('Super admin only');
    const { name, description, planType, credits, validityDays, price, currency } = body;
    if (!name || !price) throw new BadRequestException('name and price are required');
    
    const pType = planType || 'USAGE';
    if (pType === 'USAGE' && credits === undefined) {
      throw new BadRequestException('credits is required for USAGE plans');
    }
    if (pType === 'UNLIMITED' && !validityDays) {
      throw new BadRequestException('validityDays is required for UNLIMITED plans');
    }

    return this.rechargeService.createPackage({
      name,
      description,
      planType: pType,
      credits: credits !== undefined ? Number(credits) : null,
      validityDays: validityDays !== undefined ? Number(validityDays) : null,
      price: Number(price),
      currency,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('packages/:id')
  async updatePackage(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    if (!req.user?.isSuperAdmin) throw new BadRequestException('Super admin only');
    const { name, description, planType, credits, validityDays, price, isActive } = body;
    return this.rechargeService.updatePackage(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(planType !== undefined && { planType }),
      ...(credits !== undefined && { credits: credits !== null ? Number(credits) : null }),
      ...(validityDays !== undefined && { validityDays: validityDays !== null ? Number(validityDays) : null }),
      ...(price !== undefined && { price: Number(price) }),
      ...(isActive !== undefined && { isActive }),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('packages/:id')
  async deletePackage(@Request() req: any, @Param('id') id: string) {
    if (!req.user?.isSuperAdmin) throw new BadRequestException('Super admin only');
    return this.rechargeService.deletePackage(id);
  }

  // ─── Admin: Payment transactions ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    if (!req.user?.isSuperAdmin) throw new BadRequestException('Super admin only');
    return this.rechargeService.getPaymentTransactions(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
      search,
    );
  }

  // ─── User: Create Razorpay order ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(@Request() req: any, @Body('packageId') packageId: string) {
    if (!packageId) throw new BadRequestException('Package ID is required');
    return this.rechargeService.createOrder(packageId, req.user.userId);
  }

  // ─── User: Verify payment ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyPayment(
    @Body('razorpayOrderId') razorpayOrderId: string,
    @Body('razorpayPaymentId') razorpayPaymentId: string,
    @Body('razorpaySignature') razorpaySignature: string,
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
      throw new BadRequestException('All Razorpay parameters are required');
    return this.rechargeService.verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────
  @Public()
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    if (!signature) throw new BadRequestException('Webhook signature is missing');
    return this.rechargeService.handleWebhook(body, signature);
  }

  // ─── Admin: Gateway settings ─────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('gateway-settings')
  async getGatewaySettings() {
    return this.rechargeService.getGatewaySettings();
  }

  @UseGuards(JwtAuthGuard)
  @Post('gateway-settings')
  async saveGatewaySettings(
    @Body('razorpayKeyId') keyId: string,
    @Body('razorpayKeySecret') keySecret: string,
    @Body('rechargeDistributorId') distributorId: string,
  ) {
    if (!keyId || !keySecret || !distributorId) throw new BadRequestException('All settings are required');
    return this.rechargeService.saveGatewaySettings({ keyId, keySecret, distributorId });
  }
}
