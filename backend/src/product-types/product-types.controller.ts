import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.productTypesService.create(data);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string
  ) {
    return this.productTypesService.findAll(search, includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.productTypesService.update(id, data);
  }

  @Patch(':id/restore')
  @RequirePermissions('catalog:write')
  restore(@Param('id') id: string) {
    return this.productTypesService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('catalog:write')
  purge(@Param('id') id: string) {
    return this.productTypesService.purge(id);
  }
}
