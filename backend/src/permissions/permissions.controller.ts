import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
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
  @RequirePermissions('roles:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.permissionsService.remove(id, req?.user);
  }
}
