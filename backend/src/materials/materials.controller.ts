import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.materialsService.create(data);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string
  ) {
    return this.materialsService.findAll(search, includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.materialsService.update(id, data);
  }

  @Patch(':id/restore')
  @RequirePermissions('catalog:write')
  restore(@Param('id') id: string) {
    return this.materialsService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string) {
    return this.materialsService.purge(id);
  }
}
