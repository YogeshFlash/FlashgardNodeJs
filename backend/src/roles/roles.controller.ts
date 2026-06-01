import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles:write')
  create(@Body() body: any, @Req() req?: any) {
    return this.rolesService.create(body, req?.user);
  }

  @Get()
  @RequirePermissions('roles:read')
  findAll(@Query('includeDeleted') includeDeleted?: string, @Req() req?: any) {
    return this.rolesService.findAll(req?.user, includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.rolesService.findOne(id, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('roles:write')
  update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.rolesService.update(id, body, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.rolesService.remove(id, req?.user);
  }

  @Patch(':id/restore')
  @RequirePermissions('roles:delete')
  restore(@Param('id') id: string, @Req() req?: any) {
    return this.rolesService.restore(id, req?.user);
  }

  @Delete(':id/purge')
  @RequirePermissions('roles:delete')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.rolesService.purge(id, req?.user);
  }
}
