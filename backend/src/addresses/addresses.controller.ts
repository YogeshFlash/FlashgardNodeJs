import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @RequirePermissions('addresses:write')
  create(@Body() body: any, @Req() req?: any) {
    return this.addressesService.create(body, req?.user);
  }

  @Get()
  @RequirePermissions('addresses:read')
  findAll(@Query('organizationId') orgId?: string, @Req() req?: any) {
    return this.addressesService.findAll(orgId, req?.user);
  }

  @Get(':id')
  @RequirePermissions('addresses:read')
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.addressesService.findOne(id, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('addresses:write')
  update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.addressesService.update(id, body, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('addresses:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.addressesService.remove(id, req?.user);
  }
}
