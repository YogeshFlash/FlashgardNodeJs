import { Controller, Get, Post, Patch, Body, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ModelCutFilesService } from './model-cut-files.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('model-cut-files')
export class ModelCutFilesController {
  constructor(private readonly modelCutFilesService: ModelCutFilesService) {}

  @Post()
  @RequirePermissions('catalog:write')
  create(@Body() data: any) {
    return this.modelCutFilesService.create(data);
  }

  @Post('upload')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Body('modelId') modelId: string,
    @Body('cutPatternId') cutPatternId: string,
  ) {
    return this.modelCutFilesService.upload(file, modelId, cutPatternId);
  }

  @Patch(':id/normalize')
  @RequirePermissions('catalog:write')
  normalize(@Param('id') id: string) {
    return this.modelCutFilesService.normalize(id);
  }

  @Get()
  @RequirePermissions('catalog:read')
  findAll(
    @Query('modelId') modelId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
  ) {
    return this.modelCutFilesService.findAll(modelId, skip, take, search);
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  findOne(@Param('id') id: string) {
    return this.modelCutFilesService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions('catalog:write')
  remove(@Param('id') id: string) {
    return this.modelCutFilesService.remove(id);
  }
}
