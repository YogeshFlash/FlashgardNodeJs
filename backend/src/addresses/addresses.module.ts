import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
