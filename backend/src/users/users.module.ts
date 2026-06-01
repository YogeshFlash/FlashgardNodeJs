import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [OrganizationsModule, RolesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
