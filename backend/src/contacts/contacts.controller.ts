import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermissions('contacts:write')
  create(@Body() body: any, @Req() req?: any) {
    return this.contactsService.create(body, req?.user);
  }

  @Get()
  @RequirePermissions('contacts:read')
  findAll(@Query('organizationId') orgId?: string, @Query('includeDeleted') includeDeleted?: string, @Req() req?: any) {
    return this.contactsService.findAll(orgId, req?.user, includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('contacts:read')
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.contactsService.findOne(id, req?.user);
  }

  @Patch(':id')
  @RequirePermissions('contacts:write')
  update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    return this.contactsService.update(id, body, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('contacts:delete')
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.contactsService.remove(id, req?.user);
  }

  @Patch(':id/restore')
  @RequirePermissions('contacts:delete')
  restore(@Param('id') id: string) {
    return this.contactsService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('contacts:delete')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.contactsService.purge(id, req?.user);
  }
}
