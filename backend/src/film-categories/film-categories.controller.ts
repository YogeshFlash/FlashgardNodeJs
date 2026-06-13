import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FilmCategoriesService } from './film-categories.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('film-categories')
export class FilmCategoriesController {
  constructor(private readonly filmCategoriesService: FilmCategoriesService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.filmCategoriesService.create(data);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.filmCategoriesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filmCategoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.filmCategoriesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.filmCategoriesService.remove(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string) {
    return this.filmCategoriesService.purge(id);
  }
}
