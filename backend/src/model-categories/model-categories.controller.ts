import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ModelCategoriesService } from './model-categories.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('model-categories')
export class ModelCategoriesController {
  constructor(private readonly modelCategoriesService: ModelCategoriesService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.modelCategoriesService.create(data);
  }

  @Get()
  @RequirePermissions('catalog:read')
  findAll(
    @Query('parentId') parentId?: string,
    @Query('search') search?: string, 
    @Query('includeDeleted') includeDeleted?: string,
    @Query('onlyWithModels') onlyWithModels?: string
  ) {
    return this.modelCategoriesService.findAll(parentId, search, includeDeleted === 'true', onlyWithModels === 'true');
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  findOne(@Param('id') id: string) {
    return this.modelCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.modelCategoriesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.modelCategoriesService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('catalog:write')
  restore(@Param('id') id: string) {
    return this.modelCategoriesService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.modelCategoriesService.purge(id, req?.user);
  }
}
