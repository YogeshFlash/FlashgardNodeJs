import { Controller, Get, Post, Body, Param, Query, Req, Patch, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --- INWARD RECEIPTS ---

  @Get('inward-receipts')
  @RequirePermissions('inventory:read')
  findAllInwardReceipts(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('receiptCode') receiptCode?: string,
    @Query('invoiceNumber') invoiceNumber?: string,
  ) {
    return this.inventoryService.findAllInwardReceipts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      receiptCode,
      invoiceNumber,
    }, req.user);
  }

  @Post('inward-receipts')
  @RequirePermissions('inventory:write')
  createInwardReceipt(@Body() body: any, @Req() req: any) {
    return this.inventoryService.createInwardReceipt(body, req.user);
  }

  @Patch('inward-receipts/:id/delete')
  @RequirePermissions('inventory:write')
  deleteInwardReceipt(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteInwardReceipt(id, req.user);
  }

  // --- BATCHES ---

  @Post('inward/bulk')
  @RequirePermissions('inventory:write')
  createBulkInward(@Body() body: any, @Req() req: any) {
    return this.inventoryService.createBulkInward(body, req.user);
  }

  @Post('inward/raw')
  @RequirePermissions('inventory:write')
  createRawInward(@Body() body: any, @Req() req: any) {
    return this.inventoryService.createRawInward(body, req.user);
  }

  @Post('inward/procurement')
  @RequirePermissions('inventory:write')
  createInwardProcurement(@Body() body: any, @Req() req: any) {
    return this.inventoryService.createInwardProcurement(body, req.user);
  }

  @Get('batches')
  @RequirePermissions('inventory:read')
  findAllBatches(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('filmTypeId') filmTypeId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('search') search?: string,
    @Query('inwardReceiptId') inwardReceiptId?: string,
  ) {
    return this.inventoryService.findAllBatches({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
      filmTypeId,
      vendorId,
      search,
      inwardReceiptId,
    }, req.user);
  }

  @Get('batches/:id')
  @RequirePermissions('inventory:read')
  findOneBatch(@Param('id') id: string) {
    return this.inventoryService.findOneBatch(id);
  }

  @Patch('batches/:id')
  @RequirePermissions('inventory:write')
  updateBatch(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.inventoryService.updateBatch(id, body, req.user);
  }

  @Patch('batches/:id/delete')
  @RequirePermissions('inventory:write')
  deleteBatch(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteBatch(id, req.user);
  }

  @Patch('batches/:id/restore')
  @RequirePermissions('inventory:write')
  restoreBatch(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.restoreBatch(id, req.user);
  }

  @Delete('batches/:id')
  @RequirePermissions('inventory:write')
  purgeBatch(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.purgeBatch(id, req.user);
  }


  // --- WORK ORDERS ---

  @Get('work-orders')
  @RequirePermissions('inventory:read')
  findAllWorkOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.findAllWorkOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
      search,
    }, req.user);
  }

  @Get('work-orders/:id')
  @RequirePermissions('inventory:read')
  findOneWorkOrder(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.findOneWorkOrder(id, req.user);
  }

  @Patch('work-orders/:id/close')
  @RequirePermissions('inventory:write')
  closeWorkOrder(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.inventoryService.closeWorkOrder(id, body, req.user);
  }

  @Post('work-orders/:id/output')
  @RequirePermissions('inventory:write')
  addWorkOrderOutput(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.inventoryService.addWorkOrderOutput(id, body, req.user);
  }

  @Post('work-orders/:id/finalize')
  @RequirePermissions('inventory:write')
  finalizeWorkOrder(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.finalizeWorkOrder(id, req.user);
  }

  // --- QR CODES ---

  @Post('batches/:id/qr-generate')
  @RequirePermissions('inventory:write')
  generateQRCodes(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.inventoryService.generateQRCodes(id, body, req.user);
  }

  @Get('batches/:id/qrs')
  @RequirePermissions('inventory:read')
  getBatchQRCodes(@Param('id') id: string) {
    return this.inventoryService.getBatchQRCodes(id);
  }

  // --- DISPATCH & TRANSFERS ---

  @Post('dispatch')
  @RequirePermissions('inventory:write')
  createDispatch(@Body() body: any, @Req() req: any) {
    return this.inventoryService.createDispatch(body, req.user);
  }

  @Post('dispatch/:id/receive')
  @RequirePermissions('inventory:write')
  receiveDispatch(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.inventoryService.receiveDispatch(id, body, req.user);
  }

  @Get('dispatch')
  @RequirePermissions('inventory:read')
  findAllDispatches(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('fromOrgId') fromOrgId?: string,
    @Query('toOrgId') toOrgId?: string,
  ) {
    return this.inventoryService.findAllDispatches({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      fromOrgId,
      toOrgId,
    }, req.user);
  }
}


