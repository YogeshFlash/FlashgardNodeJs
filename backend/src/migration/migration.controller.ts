import { Controller, Post, Get, Body, UseInterceptors, UploadedFile, UploadedFiles, UseGuards, Res, Param } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MigrationService } from './migration.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import * as fs from 'fs';
import * as path from 'path';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('legacy/catalog')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  migrateCatalog(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateCatalog(file);
  }

  @Post('legacy/skins')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  migrateSkins(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateSkins(file);
  }

  @Post('legacy/roles')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateRoles(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateRoles(file);
  }

  @Post('legacy/users')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'users', maxCount: 1 },
    { name: 'userRoles', maxCount: 1 }
  ], {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateUsers(
    @UploadedFiles() files: {
      users?: Express.Multer.File[];
      userRoles?: Express.Multer.File[];
    }
  ) {
    const usersFile = files.users?.[0];
    const userRolesFile = files.userRoles?.[0];
    return this.migrationService.migrateUsers(
      usersFile,
      userRolesFile
    );
  }

  @Post('legacy/licenses')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'licenses', maxCount: 1 },
    { name: 'licenseDealers', maxCount: 1 }
  ], {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateLicenses(
    @UploadedFiles() files: {
      licenses?: Express.Multer.File[];
      licenseDealers?: Express.Multer.File[];
    }
  ) {
    const licensesFile = files.licenses?.[0];
    const licenseDealersFile = files.licenseDealers?.[0];
    return this.migrationService.migrateLicenses(
      licensesFile!,
      licenseDealersFile
    );
  }

  @Post('legacy/mobile-users')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'mobileUsers', maxCount: 1 }
  ], {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateMobileUsers(
    @UploadedFiles() files: {
      mobileUsers?: Express.Multer.File[];
    }
  ) {
    const mobileUsersFile = files.mobileUsers?.[0];
    return this.migrationService.migrateMobileUsers(mobileUsersFile!);
  }

  @Post('legacy/cut-credits')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'dealerAssign', maxCount: 1 },
    { name: 'count', maxCount: 1 }
  ], {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateCutCredits(
    @UploadedFiles() files: {
      dealerAssign?: Express.Multer.File[];
      count?: Express.Multer.File[];
    }
  ) {
    const dealerAssignFile = files.dealerAssign?.[0];
    const countFile = files.count?.[0];
    return this.migrationService.migrateCutCredits(dealerAssignFile!, countFile);
  }

  @Post('legacy/mobile-app-cuts')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  migrateMobileAppCuts(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateMobileAppCuts(file);
  }

  @Post('legacy/designs')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/tmp',
      filename: (req, file, cb) => {
        cb(null, `upload-${Date.now()}.csv`);
      }
    }),
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  async migrateDesigns(@UploadedFile() file: Express.Multer.File) {
    const filePath = file.path;
    const stream = fs.createReadStream(filePath);
    
    try {
        const result = await this.migrationService.migrateDesigns(stream, file.size);
        return result;
    } catch (err) {
        console.error('--- MIGRATION CRITICAL ERROR ---');
        console.error(err);
        throw err;
    } finally {
        // Cleanup temp file after migration is done (or fails)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
  }

  @Post('legacy/designs/local')
  @RequirePermissions('catalog:write')
  async migrateLocalDesigns() {
    try {
        return await this.migrationService.migrateLocalDesigns();
    } catch (err) {
        console.error('--- LOCAL MIGRATION CRITICAL ERROR ---');
        console.error(err);
        throw err;
    }
  }

  @Post('legacy/designs/generate-images')
  @RequirePermissions('catalog:write')
  generateImages() {
    return this.migrationService.generateAllImages();
  }

  @Post('legacy/designs/generate-images/model/:modelId')
  @RequirePermissions('catalog:write')
  generateImagesForModel(@Param('modelId') modelId: string) {
    return this.migrationService.generateImageForModel(modelId);
  }

  @Post('legacy/designs/generate-images/cut-file/:cutFileId')
  @RequirePermissions('catalog:write')
  generateImageForCutFile(@Param('cutFileId') cutFileId: string) {
    return this.migrationService.generateImageForCutFile(cutFileId);
  }

  @Get('logs')
  @RequirePermissions('catalog:write')
  getLogs() {
    return this.migrationService.getLogs();
  }

  @Get('logs/csv')
  @RequirePermissions('catalog:write')
  async downloadLogsCsv(@Res() res: any) {
    const csv = await this.migrationService.downloadLogsCsv();
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=migration_logs.csv');
    return res.send(csv);
  }

  @Get('logs/:id/failures')
  @RequirePermissions('catalog:write')
  async downloadFailuresCsv(@Param('id') id: string, @Res() res: any) {
    const csv = await this.migrationService.downloadFailuresCsv(id);
    if (!csv) {
      return res.status(404).send('No failures found for this migration');
    }
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=migration_failures_${id.slice(0, 8)}.csv`);
    return res.send(csv);
  }

  @Post('clean')
  @RequirePermissions('catalog:write')
  cleanData(@Body('module') module: string) {
    return this.migrationService.cleanData(module);
  }

  @Post('db/connect')
  @RequirePermissions('catalog:write')
  async dbConnect(@Body() credentials: any) {
    return this.migrationService.dbConnect(credentials);
  }

  @Post('db/run')
  @RequirePermissions('catalog:write')
  async dbRun(
    @Body('credentials') credentials: any,
    @Body('moduleType') moduleType: string,
    @Body('tableMap') tableMap: Record<string, string>
  ) {
    return this.migrationService.dbRun(credentials, moduleType, tableMap);
  }

  @Post('legacy/dealer-master-qrs')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateDealerMasterQRs(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateDealerMasterQRs(file);
  }

  @Post('legacy/plotter-masters')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migratePlotters(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migratePlotters(file);
  }

  @Post('legacy/materials')
  @RequirePermissions('catalog:write')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'productTypes', maxCount: 1 },
    { name: 'categories', maxCount: 1 },
    { name: 'filmCategories', maxCount: 1 },
    { name: 'products', maxCount: 1 },
    { name: 'displayMaster', maxCount: 1 }
  ], {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateMaterials(
    @UploadedFiles() files: {
      productTypes?: Express.Multer.File[];
      categories?: Express.Multer.File[];
      filmCategories?: Express.Multer.File[];
      products?: Express.Multer.File[];
      displayMaster?: Express.Multer.File[];
    }
  ) {
    return this.migrationService.migrateMaterialsSystem(
      files.productTypes?.[0]!,
      files.categories?.[0]!,
      files.filmCategories?.[0]!,
      files.products?.[0]!,
      files.displayMaster?.[0]!
    );
  }
}

