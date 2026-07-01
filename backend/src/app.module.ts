import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { AddressesModule } from './addresses/addresses.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLoggingInterceptor } from './audit-logs/audit-logging.interceptor';
import { FilmTypesModule } from './film-types/film-types.module';
import { ModelCategoriesModule } from './model-categories/model-categories.module';
import { BrandsModule } from './brands/brands.module';
import { ModelsModule } from './models/models.module';
import { CutPatternsModule } from './cut-patterns/cut-patterns.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ModelCutFilesModule } from './model-cut-files/model-cut-files.module';
import { OrganizationTypesModule } from './organization-types/organization-types.module';
import { InventoryModule } from './inventory/inventory.module';
import { LicensesModule } from './licenses/licenses.module';
import { CutCreditsModule } from './cut-credits/cut-credits.module';
import { FilesModule } from './files/files.module';
import { MigrationModule } from './migration/migration.module';
import { MachineCutsModule } from './machine-cuts/machine-cuts.module';
import { ProductTypesModule } from './product-types/product-types.module';
import { MaterialCategoriesModule } from './material-categories/material-categories.module';
import { FilmCategoriesModule } from './film-categories/film-categories.module';
import { MaterialsModule } from './materials/materials.module';
import { PlottersModule } from './plotters/plotters.module';
import { MobileHomeModule } from './mobile-home/mobile-home.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    PrismaModule, 
    OrganizationsModule, 
    UsersModule, 
    ContactsModule, 
    AddressesModule, 
    RolesModule, 
    AuthModule, 
    PermissionsModule, 
    AuditLogsModule,
    FilmTypesModule,
    ModelCategoriesModule,
    BrandsModule,
    ModelsModule,
    CutPatternsModule,
    ModelCutFilesModule,
    OrganizationTypesModule,
    InventoryModule,
    LicensesModule,
    CutCreditsModule,
    FilesModule,
    MigrationModule,
    MachineCutsModule,
    ProductTypesModule,
    MaterialCategoriesModule,
    FilmCategoriesModule,
    MaterialsModule,
    PlottersModule,
    MobileHomeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
})
export class AppModule {}
