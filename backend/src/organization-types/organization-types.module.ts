import { Module } from '@nestjs/common';
import { OrganizationTypesController } from './organization-types.controller';
import { OrganizationTypesService } from './organization-types.service';

@Module({
  controllers: [OrganizationTypesController],
  providers: [OrganizationTypesService]
})
export class OrganizationTypesModule {}
