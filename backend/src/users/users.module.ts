import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
