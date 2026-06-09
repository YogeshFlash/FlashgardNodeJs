import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { CutPatternsService } from './cut-patterns.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('cut-patterns')
export class CutPatternsController {
  constructor(private readonly cutPatternsService: CutPatternsService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.cutPatternsService.create(data);
  }

  @Get()
  @RequirePermissions('catalog:read')
  findAll(@Query('search') search?: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.cutPatternsService.findAll(search, includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  findOne(@Param('id') id: string) {
    return this.cutPatternsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.cutPatternsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.cutPatternsService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('catalog:write')
  restore(@Param('id') id: string) {
    return this.cutPatternsService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.cutPatternsService.purge(id, req?.user);
  }
}
