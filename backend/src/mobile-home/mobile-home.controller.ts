import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MobileHomeService } from './mobile-home.service';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('mobile-home')
export class MobileHomeController {
  constructor(private readonly service: MobileHomeService) {}

  // Mobile App Content Retrieval Endpoint
  @Public()
  @Get('content')
  getMobileContent() {
    return this.service.getMobileContent();
  }

  // --- Promotions CRUD ---
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Get('promotions')
  getPromotions() {
    return this.service.getPromotions();
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Post('promotions')
  createPromotion(@Body() body: any) {
    return this.service.createPromotion(body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Put('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePromotion(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Delete('promotions/:id')
  deletePromotion(@Param('id') id: string) {
    return this.service.deletePromotion(id);
  }

  // --- Quick Actions CRUD ---
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Get('actions')
  getActions() {
    return this.service.getActions();
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Post('actions')
  createAction(@Body() body: any) {
    return this.service.createAction(body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Put('actions/:id')
  updateAction(@Param('id') id: string, @Body() body: any) {
    return this.service.updateAction(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Delete('actions/:id')
  deleteAction(@Param('id') id: string) {
    return this.service.deleteAction(id);
  }

  // --- Info Cards CRUD ---
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Get('infocards')
  getInfoCards() {
    return this.service.getInfoCards();
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Post('infocards')
  createInfoCard(@Body() body: any) {
    return this.service.createInfoCard(body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Put('infocards/:id')
  updateInfoCard(@Param('id') id: string, @Body() body: any) {
    return this.service.updateInfoCard(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @RequirePermissions('settings:write')
  @Delete('infocards/:id')
  deleteInfoCard(@Param('id') id: string) {
    return this.service.deleteInfoCard(id);
  }
}
