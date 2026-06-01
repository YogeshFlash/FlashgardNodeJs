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
  @RequirePermissions('models:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  migrateCatalog(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateCatalog(file);
  }

  @Post('legacy/skins')
  @RequirePermissions('models:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB
  }))
  migrateSkins(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateSkins(file);
  }

  @Post('legacy/roles')
  @RequirePermissions('models:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
  }))
  migrateRoles(@UploadedFile() file: Express.Multer.File) {
    return this.migrationService.migrateRoles(file);
  }

  @Post('legacy/users')
  @RequirePermissions('models:write')
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
  @RequirePermissions('models:write')
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
  @RequirePermissions('models:write')
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

  @Post('legacy/designs')
  @RequirePermissions('models:write')
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
  @RequirePermissions('models:write')
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
  @RequirePermissions('models:write')
  generateImages() {
    return this.migrationService.generateAllImages();
  }

  @Post('legacy/designs/generate-images/model/:modelId')
  @RequirePermissions('models:write')
  generateImagesForModel(@Param('modelId') modelId: string) {
    return this.migrationService.generateImageForModel(modelId);
  }

  @Post('legacy/designs/generate-images/cut-file/:cutFileId')
  @RequirePermissions('models:write')
  generateImageForCutFile(@Param('cutFileId') cutFileId: string) {
    return this.migrationService.generateImageForCutFile(cutFileId);
  }

  @Get('logs')
  @RequirePermissions('models:write')
  getLogs() {
    return this.migrationService.getLogs();
  }

  @Get('logs/csv')
  @RequirePermissions('models:write')
  async downloadLogsCsv(@Res() res: any) {
    const csv = await this.migrationService.downloadLogsCsv();
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=migration_logs.csv');
    return res.send(csv);
  }

  @Get('logs/:id/failures')
  @RequirePermissions('models:write')
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
  @RequirePermissions('models:write')
  cleanData(@Body('module') module: string) {
    return this.migrationService.cleanData(module);
  }
}
