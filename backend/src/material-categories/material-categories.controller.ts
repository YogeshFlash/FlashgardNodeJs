import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MaterialCategoriesService } from './material-categories.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('material-categories')
export class MaterialCategoriesController {
  constructor(private readonly materialCategoriesService: MaterialCategoriesService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.materialCategoriesService.create(data);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string
  ) {
    return this.materialCategoriesService.findAll(search, includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.materialCategoriesService.update(id, data);
  }

  @Patch(':id/restore')
  @RequirePermissions('catalog:write')
  restore(@Param('id') id: string) {
    return this.materialCategoriesService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.materialCategoriesService.remove(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string) {
    return this.materialCategoriesService.purge(id);
  }
}
