import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
