import { Controller, Get, Req } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit:read')
  findAll(@Req() req?: any) {
    return this.auditLogsService.findAll(req?.user);
  }
}
