import { Controller, Get, Post, Body, Param, Request, UseGuards, Query } from '@nestjs/common';
import { CutCreditsService } from './cut-credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('cut-credits')
export class CutCreditsController {
  constructor(private readonly cutCreditsService: CutCreditsService) {}

  @Post('issue')
  @RequirePermissions('credits:admin')
  issue(@Request() req: any, @Body() data: any) {
    return this.cutCreditsService.issueCutCredits({
      ...data,
      userId: req.user.userId,
    });
  }

  @Post('dispatch')
  @RequirePermissions('credits:write')
  dispatch(@Request() req: any, @Body() data: { amount: number; toOrgId: string; fromOrgId?: string; targetLicenseId?: string }) {
    const fromOrgId = (req.user.isSuperAdmin && data.fromOrgId) ? data.fromOrgId : req.user.organizationId;
    return this.cutCreditsService.dispatch({
      ...data,
      fromOrgId,
      userId: req.user.userId,
      isSuperAdmin: req.user.isSuperAdmin,
    });
  }

  @Get('wallet/:machineId')
  @RequirePermissions('credits:read')
  getWallet(@Param('machineId') machineId: string) {
    return this.cutCreditsService.getWallet(machineId);
  }

  @Get('inventory')
  @RequirePermissions('credits:read')
  getInventory(
    @Request() req: any, 
    @Query('orgId') targetOrgId?: string,
    @Query('receivingOrgId') receivingOrgId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('planType') planType?: string
  ) {
    // When receivingOrgId is supplied, return credits RECEIVED by that org (tenantId filter)
    if (receivingOrgId) {
      return this.cutCreditsService.getReceivedInventory(receivingOrgId);
    }
    const orgId = targetOrgId || req.user?.organizationId;
    const isSuperAdminForQuery = req.user?.isSuperAdmin && !targetOrgId;
    return this.cutCreditsService.getMyInventory(orgId, isSuperAdminForQuery, skip, take, search, planType);
  }

  @Get('transfers')
  @RequirePermissions('credits:read')
  getTransfers(@Request() req: any, @Query('orgId') targetOrgId?: string) {
    if (req.user.isSuperAdmin && targetOrgId) {
      return this.cutCreditsService.getTransfers(targetOrgId, false);
    }
    return this.cutCreditsService.getTransfers(req.user.organizationId, req.user.isSuperAdmin);
  }


}
