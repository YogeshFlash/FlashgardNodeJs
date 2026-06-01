import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ModelsService } from './models.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  @RequirePermissions('models:write')
  create(@Body() data: any) {
    return this.modelsService.create(data);
  }

  @Get('active-combinations')
  @RequirePermissions('models:read')
  getActiveCombinations() {
    return this.modelsService.getActiveCombinations();
  }

  @Get()
  @RequirePermissions('models:read')
  findAll(
    @Query('brandId') brandId?: string, 
    @Query('categoryId') categoryId?: string, 
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number
  ) {
    return this.modelsService.findAll(brandId, categoryId, search, includeDeleted === 'true', skip, take);
  }

  @Get(':id')
  @RequirePermissions('models:read')
  findOne(@Param('id') id: string) {
    return this.modelsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('models:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.modelsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('models:write')
  remove(@Param('id') id: string) {
    return this.modelsService.remove(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('models:write')
  restore(@Param('id') id: string) {
    return this.modelsService.restore(id);
  }

  @Delete(':id/purge')
  @RequirePermissions('models:write')
  purge(@Param('id') id: string, @Req() req?: any) {
    return this.modelsService.purge(id, req?.user);
  }
}
