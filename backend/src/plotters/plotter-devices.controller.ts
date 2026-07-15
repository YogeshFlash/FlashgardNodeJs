import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PlotterDevicesService } from './plotter-devices.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('plotter-devices')
export class PlotterDevicesController {
  constructor(private readonly plotterDevicesService: PlotterDevicesService) {}

  @Post('check-or-register')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('cuts:write')
  checkOrRegister(@Request() req: any, @Body() data: any) {
    const organizationId = req.user.organizationId;
    return this.plotterDevicesService.checkOrRegister({
      name: data.name,
      macAddress: data.macAddress,
      organizationId,
    });
  }

  @Post()
  @RequirePermissions('settings:write')
  create(@Body() data: any) {
    return this.plotterDevicesService.create(data);
  }

  @Get()
  @RequirePermissions('settings:read')
  findAll(
    @Query('search') search?: string,
    @Query('plotterMasterId') plotterMasterId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageVal = page ? parseInt(page, 10) : undefined;
    const limitVal = limit ? parseInt(limit, 10) : undefined;
    return this.plotterDevicesService.findAll(search, plotterMasterId, organizationId, pageVal, limitVal);
  }

  @Get(':id')
  @RequirePermissions('settings:read')
  findOne(@Param('id') id: string) {
    return this.plotterDevicesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('settings:write')
  update(@Param('id') id: string, @Body() data: any) {
    return this.plotterDevicesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('settings:write')
  remove(@Param('id') id: string) {
    return this.plotterDevicesService.remove(id);
  }
}
