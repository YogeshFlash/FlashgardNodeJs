import { Controller, Post, Get, Body, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { MachineCutsService } from './machine-cuts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('cuts')
export class MachineCutsController {
  constructor(private readonly machineCutsService: MachineCutsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('cuts:write')
  async validateCut(@Request() req: any, @Body() data: any) {
    // Expected data: { licenseKey: string, organizationId: string, modelId: string }
    const organizationId = data.organizationId || req.user.organizationId;
    return this.machineCutsService.validateCut({
      ...data,
      organizationId,
      userId: req.user.userId,
    });
  }

  @Post('log')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('cuts:write')
  async logCut(@Request() req: any, @Body() data: any) {
    // Expected data: { cutToken: string, plotterId: string, isPositiveCut: boolean, latitude: number, longitude: number, ... }
    return this.machineCutsService.logCut({
      ...data,
      userId: req.user.userId,
    });
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('licenses:read')
  async getLogs(
    @Request() req: any,
    @Query('licenseId') licenseId?: string,
    @Query('orgId') orgId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('isPositiveCut') isPositiveCut?: string,
    @Query('categoryName') categoryName?: string
  ) {
    const skipVal = skip ? parseInt(skip) : 0;
    const takeVal = take ? parseInt(take) : 50;
    const isPositive = isPositiveCut === 'true' ? true : (isPositiveCut === 'false' ? false : undefined);

    const organizationId = req.user.isSuperAdmin ? orgId : (orgId || req.user.organizationId);

    return this.machineCutsService.getLogs({
      orgId: organizationId,
      licenseId,
      skip: skipVal,
      take: takeVal,
      search,
      isPositiveCut: isPositive,
      isSuperAdmin: req.user.isSuperAdmin,
      categoryName
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('licenses:read')
  async getStats(
    @Request() req: any,
    @Query('orgId') orgId?: string,
    @Query('range') range?: string
  ) {
    const rangeVal = range ? parseInt(range) : 6;
    const organizationId = req.user.isSuperAdmin ? orgId : (orgId || req.user.organizationId);

    return this.machineCutsService.getReportsStats({
      orgId: organizationId,
      isSuperAdmin: req.user.isSuperAdmin,
      range: rangeVal
    });
  }

  @Get('report')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('licenses:read')
  async getReport(
    @Request() req: any,
    @Query('orgId') orgId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const skipVal = skip ? parseInt(skip) : 0;
    const takeVal = take ? parseInt(take) : 50;
    const organizationId = req.user.isSuperAdmin ? orgId : (orgId || req.user.organizationId);

    return this.machineCutsService.getReport({
      orgId: organizationId,
      isSuperAdmin: req.user.isSuperAdmin,
      startDate,
      endDate,
      search,
      skip: skipVal,
      take: takeVal
    });
  }
}


