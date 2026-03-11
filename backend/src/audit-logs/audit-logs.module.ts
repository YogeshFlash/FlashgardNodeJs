import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditLoggingInterceptor } from './audit-logging.interceptor';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLoggingInterceptor],
  exports: [AuditLogsService, AuditLoggingInterceptor]
})
export class AuditLogsModule {}
