import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MigrationService } from './migration.service';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationScheduleConfig {
  enabled: boolean;
  frequency: string; // '1h' | '3h' | '6h' | '12h' | '24h'
  lookbackDays: number; // e.g. 1, 2, 3, 7, 14, 30
  connection: {
    server: string;
    database: string;
    user: string;
    password: string;
    port: number;
  };
  useCustomDesignsConnection: boolean;
  designsConnection: {
    server: string;
    database: string;
    user: string;
    password: string;
    port: number;
  };
  entities: {
    catalog: boolean;
    skins: boolean;
    designs: boolean;
    roles: boolean;
    users: boolean;
    licenses: boolean;
    mobileUsers: boolean;
    cutCredits: boolean;
    mobileAppCuts: boolean;
    dealerMasterQrs: boolean;
    plotterMasters: boolean;
    materials: boolean;
    stock: boolean;
    orders: boolean;
  };
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  lastError: string | null;
  lastResult: any;
}

export interface MigrationLogEntry {
  id: string;
  timestamp: string;
  triggerType: 'MANUAL' | 'SCHEDULED';
  lookbackDays: number;
  entitiesSynced: string[];
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  recordsSummary?: string;
  error?: string;
  details?: any;
}

@Injectable()
export class MigrationScheduleService implements OnModuleInit {
  private readonly logger = new Logger(MigrationScheduleService.name);
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly settingsFilePath = path.join(this.dataDir, 'migration-schedule-settings.json');
  private readonly logsFilePath = path.join(this.dataDir, 'migration-schedule-logs.json');

  private timerRef: NodeJS.Timeout | null = null;

  private settings: MigrationScheduleConfig = {
    enabled: false,
    frequency: '12h',
    lookbackDays: 3,
    connection: {
      server: process.env.MSSQL_SERVER || 'Yogesh',
      database: process.env.MSSQL_DATABASE || 'scratchgard',
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || 'sqldb2023',
      port: 1433,
    },
    useCustomDesignsConnection: false,
    designsConnection: {
      server: process.env.MSSQL_SERVER || 'Yogesh',
      database: 'scratchgard_designs',
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || 'sqldb2023',
      port: 1433,
    },
    entities: {
      catalog: false,
      skins: false,
      designs: false,
      roles: false,
      users: false,
      licenses: false,
      mobileUsers: false,
      cutCredits: true,
      mobileAppCuts: true,
      dealerMasterQrs: false,
      plotterMasters: false,
      materials: false,
      stock: true,
      orders: true,
    },
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: 'IDLE',
    lastError: null,
    lastResult: null,
  };

  private logs: MigrationLogEntry[] = [];

  constructor(private readonly migrationService: MigrationService) {
    this.ensureDataDirectory();
    this.loadSettings();
    this.loadLogs();
  }

  onModuleInit() {
    this.startSchedulerTick();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (e) {
        this.logger.error('Failed to create data directory', e);
      }
    }
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = {
          ...this.settings,
          ...parsed,
          connection: { ...this.settings.connection, ...(parsed.connection || {}) },
          designsConnection: { ...this.settings.designsConnection, ...(parsed.designsConnection || {}) },
          entities: { ...this.settings.entities, ...(parsed.entities || {}) },
        };
      }
    } catch (e) {
      this.logger.error('Error loading migration schedule settings', e);
    }
  }

  private saveSettings() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Error saving migration schedule settings', e);
    }
  }

  private loadLogs() {
    try {
      if (fs.existsSync(this.logsFilePath)) {
        const raw = fs.readFileSync(this.logsFilePath, 'utf8');
        this.logs = JSON.parse(raw);
      }
    } catch (e) {
      this.logger.error('Error loading migration schedule logs', e);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      this.ensureDataDirectory();
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(0, 100);
      }
      fs.writeFileSync(this.logsFilePath, JSON.stringify(this.logs, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Error saving migration schedule logs', e);
    }
  }

  public getSettings(): MigrationScheduleConfig {
    return this.settings;
  }

  public updateSettings(partial: Partial<MigrationScheduleConfig>): MigrationScheduleConfig {
    this.settings = {
      ...this.settings,
      ...partial,
      connection: {
        ...this.settings.connection,
        ...(partial.connection || {}),
      },
      designsConnection: {
        ...this.settings.designsConnection,
        ...(partial.designsConnection || {}),
      },
      entities: {
        ...this.settings.entities,
        ...(partial.entities || {}),
      },
    };

    if (this.settings.enabled) {
      this.calculateNextRunAt();
    } else {
      this.settings.nextRunAt = null;
    }

    this.saveSettings();
    return this.settings;
  }

  public getLogs(): MigrationLogEntry[] {
    return this.logs;
  }

  private calculateNextRunAt() {
    const hours = this.parseFrequencyHours(this.settings.frequency);
    const next = new Date(Date.now() + hours * 60 * 60 * 1000);
    this.settings.nextRunAt = next.toISOString();
  }

  private parseFrequencyHours(freq: string): number {
    switch (freq) {
      case '1h': return 1;
      case '3h': return 3;
      case '6h': return 6;
      case '12h': return 12;
      case '24h': return 24;
      default: return 12;
    }
  }

  private startSchedulerTick() {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }

    this.timerRef = setInterval(() => {
      this.checkAndRunScheduled();
    }, 60000);
  }

  private checkAndRunScheduled() {
    if (!this.settings.enabled) return;
    if (this.settings.lastStatus === 'RUNNING') return;
    if (!this.settings.nextRunAt) {
      this.calculateNextRunAt();
      this.saveSettings();
      return;
    }

    const nextTime = new Date(this.settings.nextRunAt).getTime();
    if (Date.now() >= nextTime) {
      this.triggerMigration('SCHEDULED');
    }
  }

  public async triggerMigration(triggerType: 'MANUAL' | 'SCHEDULED' = 'MANUAL') {
    if (this.settings.lastStatus === 'RUNNING') {
      return {
        status: 'RUNNING',
        message: 'Migration sync is already in progress.',
        settings: this.settings,
      };
    }

    const startTime = Date.now();
    this.settings.lastStatus = 'RUNNING';
    this.settings.lastRunAt = new Date().toISOString();
    this.settings.lastError = null;
    this.saveSettings();

    const enabledEntities: string[] = [];
    const ent = this.settings.entities;

    if (ent.catalog) enabledEntities.push('1. Categories & Brands');
    if (ent.skins) enabledEntities.push('2. Cut Patterns');
    if (ent.designs) enabledEntities.push('3. Models & Designs');
    if (ent.roles) enabledEntities.push('4. User Roles');
    if (ent.users) enabledEntities.push('5. Org & Users');
    if (ent.licenses) enabledEntities.push('6. Licenses');
    if (ent.mobileUsers) enabledEntities.push('7. Mobile Users');
    if (ent.cutCredits) enabledEntities.push('8. Cut Credits');
    if (ent.mobileAppCuts) enabledEntities.push('9. Mobile App Cuts');
    if (ent.dealerMasterQrs) enabledEntities.push('10. Dealer Master QRs');
    if (ent.plotterMasters) enabledEntities.push('11. Plotter Masters');
    if (ent.materials) enabledEntities.push('12. Materials System');
    if (ent.stock) enabledEntities.push('13. Stock & Dispatches');
    if (ent.orders) enabledEntities.push('14. Order History');

    this.logger.log(`Starting ${triggerType} migration sync for entities [${enabledEntities.join(', ')}] with lookback ${this.settings.lookbackDays} days on server ${this.settings.connection.server}:${this.settings.connection.database}...`);

    (async () => {
      let recordsSummary = '';
      try {
        const results: any = {};
        const connConfig = {
          server: this.settings.connection.server,
          database: this.settings.connection.database,
          user: this.settings.connection.user,
          password: this.settings.connection.password,
          lookbackDays: this.settings.lookbackDays,
        };

        const designsConnConfig = this.settings.useCustomDesignsConnection ? {
          server: this.settings.designsConnection.server,
          database: this.settings.designsConnection.database,
          user: this.settings.designsConnection.user,
          password: this.settings.designsConnection.password,
          lookbackDays: this.settings.lookbackDays,
        } : connConfig;

        if (this.settings.entities.stock) {
          const stockRes = await this.migrationService.migrateStockFromSqlServer(connConfig);
          results.stock = stockRes;
        }

        if (this.settings.entities.designs) {
          const designsRes = await this.migrationService.dbRun(designsConnConfig, 'designs', { file1: 'ModelMaster' });
          results.designs = designsRes;
        }

        const durationMs = Date.now() - startTime;
        this.settings.lastStatus = 'SUCCESS';
        this.settings.lastResult = results;
        this.calculateNextRunAt();
        this.saveSettings();

        recordsSummary = `Synced ${enabledEntities.join(', ') || 'None'} successfully in ${(durationMs / 1000).toFixed(1)}s`;

        const logEntry: MigrationLogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          triggerType,
          lookbackDays: this.settings.lookbackDays,
          entitiesSynced: enabledEntities,
          status: 'SUCCESS',
          durationMs,
          recordsSummary,
          details: results,
        };

        this.logs.unshift(logEntry);
        this.saveLogs();

        this.logger.log(`Migration sync completed successfully: ${recordsSummary}`);
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        this.settings.lastStatus = 'FAILED';
        this.settings.lastError = err?.message || 'Migration sync failed';
        this.calculateNextRunAt();
        this.saveSettings();

        const logEntry: MigrationLogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          triggerType,
          lookbackDays: this.settings.lookbackDays,
          entitiesSynced: enabledEntities,
          status: 'FAILED',
          durationMs,
          error: err?.message || 'Unknown error occurred during migration sync',
        };

        this.logs.unshift(logEntry);
        this.saveLogs();

        this.logger.error(`Migration sync failed: ${err?.message}`, err?.stack);
      }
    })();

    return {
      status: 'STARTED',
      message: `Incremental migration sync (${triggerType}) started in background.`,
      settings: this.settings,
    };
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
    return { success: true, message: 'Schedule logs cleared.' };
  }
}
