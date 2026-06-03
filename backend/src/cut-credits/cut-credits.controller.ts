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
  dispatch(@Request() req: any, @Body() data: { creditIds: string[]; toOrgId: string }) {
    return this.cutCreditsService.dispatch({
      ...data,
      fromOrgId: req.user.organizationId,
      userId: req.user.userId,
      isSuperAdmin: req.user.isSuperAdmin,
    });
  }

  @Post('accept-transfer/:id')
  @RequirePermissions('credits:write')
  acceptTransfer(@Request() req: any, @Param('id') transferId: string) {
    return this.cutCreditsService.acceptTransfer(transferId, req.user.userId);
  }

  @Post('activate')
  @RequirePermissions('credits:activate')
  activate(@Request() req: any, @Body() data: { key: string, machineId: string, fingerprint: any, geo: any }) {
    return this.cutCreditsService.activate({
      ...data,
      userId: req.user.userId
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
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('batchId') batchId?: string
  ) {
    const orgId = targetOrgId || req.user?.organizationId;
    const isSuperAdminForQuery = req.user?.isSuperAdmin && !targetOrgId;
    return this.cutCreditsService.getMyInventory(orgId, isSuperAdminForQuery, skip, take, search, batchId);
  }

  @Get('transfers')
  @RequirePermissions('credits:read')
  getTransfers(@Request() req: any, @Query('orgId') targetOrgId?: string) {
    if (req.user.isSuperAdmin && targetOrgId) {
      return this.cutCreditsService.getTransfers(targetOrgId, false);
    }
    return this.cutCreditsService.getTransfers(req.user.organizationId, req.user.isSuperAdmin);
  }

  @Get('batches')
  @RequirePermissions('credits:admin')
  getBatches() {
    return this.cutCreditsService.getBatches();
  }
}
