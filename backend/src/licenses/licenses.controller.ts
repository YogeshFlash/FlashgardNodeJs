import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards, Query } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post('issue')
  @RequirePermissions('licenses:admin')
  issue(@Request() req: any, @Body() data: any) {
    return this.licensesService.issueOrgLicense({
      ...data,
      userId: req.user.userId,
    });
  }

  @Post('dispatch')
  @RequirePermissions('licenses:write')
  dispatch(@Request() req: any, @Body() data: { licenseIds: string[]; toOrgId: string }) {
    return this.licensesService.dispatch({
      ...data,
      fromOrgId: req.user.organizationId,
      userId: req.user.userId,
      isSuperAdmin: req.user.isSuperAdmin,
    });
  }

  @Post('accept-transfer/:id')
  @RequirePermissions('licenses:write')
  acceptTransfer(@Request() req: any, @Param('id') transferId: string) {
    return this.licensesService.acceptTransfer(transferId, req.user.userId);
  }

  @Post('reject-transfer/:id')
  @RequirePermissions('licenses:write')
  rejectTransfer(@Request() req: any, @Param('id') transferId: string) {
    return this.licensesService.rejectTransfer(transferId, req.user.userId);
  }

  @Post('recall-transfer/:id')
  @RequirePermissions('licenses:write')
  recallTransfer(@Request() req: any, @Param('id') transferId: string) {
    return this.licensesService.recallTransfer(transferId, req.user.userId);
  }

  @Post('activate')
  @RequirePermissions('licenses:activate')
  activate(@Request() req: any, @Body() data: { key: string, fingerprint: any, geo: any }) {
    return this.licensesService.activate({
      ...data,
      userId: req.user.userId
    });
  }

  @Get('inventory')
  @RequirePermissions('licenses:read')
  getInventory(
    @Request() req: any, 
    @Query('orgId') targetOrgId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('batchId') batchId?: string,
    @Query('status') status?: string,
    @Query('hideUnavailable') hideUnavailable?: string
  ) {
    const orgId = targetOrgId || req.user?.organizationId;
    const isSuperAdminForQuery = req.user?.isSuperAdmin && !targetOrgId;
    const hideUnav = hideUnavailable === 'true';
    return this.licensesService.getMyInventory(orgId, isSuperAdminForQuery, skip, take, search, batchId, status, hideUnav);
  }

  @Get('transfers')
  @RequirePermissions('licenses:read')
  getTransfers(@Request() req: any, @Query('orgId') targetOrgId?: string) {
    if (req.user.isSuperAdmin && targetOrgId) {
      return this.licensesService.getTransfers(targetOrgId, false);
    }
    return this.licensesService.getTransfers(req.user.organizationId, req.user.isSuperAdmin);
  }

  @Get('batches')
  @RequirePermissions('licenses:read')
  getBatches(@Request() req: any) {
    const orgId = req.user.isSuperAdmin ? undefined : req.user.organizationId;
    return this.licensesService.getBatches(req.user.tenantId, orgId);
  }

  @Get('batches/:id')
  @RequirePermissions('licenses:admin')
  getBatchDetails(@Param('id') id: string) {
    return this.licensesService.getBatchDetails(id);
  }

  @Patch(':id/status')
  @RequirePermissions('licenses:admin')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: any }) {
    return this.licensesService.updateStatus(id, body.status, req.user.userId);
  }
}
