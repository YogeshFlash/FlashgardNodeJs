import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { OrganizationTypesService } from './organization-types.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('organization-types')
export class OrganizationTypesController {
  constructor(private readonly organizationTypesService: OrganizationTypesService) {}

  @Post()
  @RequirePermissions('orgs:write')
  create(@Body() data: any) {
    return this.organizationTypesService.create(data);
  }

  @Get()
  @RequirePermissions('orgs:read')
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.organizationTypesService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('orgs:read')
  findOne(@Param('id') id: string) {
    return this.organizationTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('orgs:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.organizationTypesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('orgs:write')
  remove(@Param('id') id: string) {
    return this.organizationTypesService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('orgs:write')
  restore(@Param('id') id: string, @Req() req?: any) {
    return this.organizationTypesService.restore(id, req?.user);
  }

  @Delete(':id/purge')
  @RequirePermissions('orgs:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.organizationTypesService.purge(id, req?.user);
  }
}
