import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users:write')
  create(@Body() body: any, @Req() req?: any) {
    return this.usersService.create(body, req?.user);
  }

  @Get()
  @RequirePermissions('users:read')
  findAll(@Query('search') search?: string, @Req() req?: any) {
    return this.usersService.findAll(search, req?.user);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.findOne(id, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.usersService.update(id, body, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.remove(id, req?.user);
  }
}
