import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.permissionsService.findAll(includeDeleted === 'true');
  }

  @Post()
  @RequirePermissions('roles:write')
  create(@Body() data: { action: string; description?: string }, @Req() req?: any) {
    return this.permissionsService.create(data, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('roles:write')
  update(@Param('id') id: string, @Body() data: { action?: string; description?: string }, @Req() req?: any) {
    return this.permissionsService.update(id, data, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('roles:write')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.permissionsService.remove(id, req?.user);
  }

  @Patch(':id/restore')
  @RequirePermissions('roles:write')
  restore(@Param('id') id: string, @Req() req?: any) {
    return this.permissionsService.restore(id, req?.user);
  }

  @Delete(':id/purge')
  @RequirePermissions('roles:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.permissionsService.purge(id, req?.user);
  }
}
