import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Put } from '@nestjs/common';
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
  findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('orgId') orgId?: string,
    @Req() req?: any
  ) {
    const skipVal = skip ? parseInt(skip, 10) : undefined;
    const takeVal = take ? parseInt(take, 10) : undefined;
    return this.usersService.findAll(search, req?.user, includeDeleted === 'true', skipVal, takeVal, orgId);
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
  @RequirePermissions('users:write')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.remove(id, req?.user);
  }

  @Patch(':id/restore')
  @RequirePermissions('users:write') // Re-using delete permission for restore/purge
  restore(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.restore(id, req?.user);
  }

  @Delete(':id/purge')
  @RequirePermissions('users:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.purge(id, req?.user);
  }

  @Get(':id/permissions')
  @RequirePermissions('users:read')
  getPermissions(@Param('id') id: string, @Req() req?: any) {
    return this.usersService.getPermissions(id, req?.user);
  }

  @Put(':id/permissions')
  @RequirePermissions('users:write')
  updatePermissions(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.usersService.updatePermissions(id, body, req?.user);
  }

  @Post(':id/reset-password')
  @RequirePermissions('users:write')
  resetPassword(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.usersService.resetPassword(id, body.newPassword, req?.user);
  }
}
