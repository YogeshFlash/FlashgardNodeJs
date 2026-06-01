import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { FilmTypesService } from './film-types.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('film-types')
export class FilmTypesController {
  constructor(private readonly filmTypesService: FilmTypesService) {}

  @Post()
  @RequirePermissions('models:write')
  create(@Body() data: any) {
    return this.filmTypesService.create(data);
  }

  @Get()
  @RequirePermissions('models:read')
  findAll(@Query('search') search?: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.filmTypesService.findAll(search, includeDeleted === 'true');
  }

  @Get(':id')
  @RequirePermissions('models:read')
  findOne(@Param('id') id: string) {
    return this.filmTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('models:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.filmTypesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('models:write')
  remove(@Param('id') id: string) {
    return this.filmTypesService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('models:write')
  restore(@Param('id') id: string) {
    return this.filmTypesService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('models:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.filmTypesService.purge(id, req?.user);
  }
}
