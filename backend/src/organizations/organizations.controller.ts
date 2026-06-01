import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('orgs:write')
  create(@Body() body: any, @Req() req: any) {
    return this.organizationsService.create(body, req.user);
  }

  @Get()
  @RequirePermissions('orgs:read')
  findAll(@Query('search') search?: string, @Query('includeDeleted') includeDeleted?: string, @Req() req?: any) {
    return this.organizationsService.findAll(search, req?.user, includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('orgs:read')
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.organizationsService.findOne(id, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('orgs:write')
  update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.organizationsService.update(id, body, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('orgs:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.organizationsService.remove(id, req?.user);
  }
}
