import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @RequirePermissions('models:write')
  create(@Body() data: any) {
    return this.brandsService.create(data);
  }

  @Get()
  @RequirePermissions('models:read')
  findAll(
    @Query('search') search?: string, 
    @Query('includeDeleted') includeDeleted?: string,
    @Query('categoryId') categoryId?: string,
    @Query('onlyWithModels') onlyWithModels?: string
  ) {
    return this.brandsService.findAll(search, includeDeleted === 'true', categoryId, onlyWithModels === 'true');
  }

  @Get(':id')
  @RequirePermissions('models:read')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('models:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('models:write')
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('models:write')
  restore(@Param('id') id: string) {
    return this.brandsService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('models:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.brandsService.purge(id, req?.user);
  }
}
