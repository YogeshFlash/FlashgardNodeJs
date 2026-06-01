import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ModelCategoriesService } from './model-categories.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('model-categories')
export class ModelCategoriesController {
  constructor(private readonly modelCategoriesService: ModelCategoriesService) {}

  @Post()
  @RequirePermissions('models:write')
  create(@Body() data: any) {
    return this.modelCategoriesService.create(data);
  }

  @Get()
  @RequirePermissions('models:read')
  findAll(
    @Query('parentId') parentId?: string,
    @Query('search') search?: string, 
    @Query('includeDeleted') includeDeleted?: string,
    @Query('onlyWithModels') onlyWithModels?: string
  ) {
    return this.modelCategoriesService.findAll(parentId, search, includeDeleted === 'true', onlyWithModels === 'true');
  }

  @Get(':id')
  @RequirePermissions('models:read')
  findOne(@Param('id') id: string) {
    return this.modelCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('models:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.modelCategoriesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('models:write')
  remove(@Param('id') id: string) {
    return this.modelCategoriesService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('models:write')
  restore(@Param('id') id: string) {
    return this.modelCategoriesService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('models:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.modelCategoriesService.purge(id, req?.user);
  }
}
