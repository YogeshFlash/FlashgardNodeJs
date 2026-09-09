import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

const ENTITY_MAP: Record<string, string> = {
  organizations: 'ORGANIZATION',
  orgs: 'ORGANIZATION',
  users: 'USER',
  roles: 'ROLE',
  permissions: 'PERMISSION',
  plotters: 'PLOTTER',
  'plotter-devices': 'PLOTTER',
  'plotter-masters': 'PLOTTERMASTER',
  'cut-credits': 'CUTCREDIT',
  licenses: 'ORGLICENSE',
  materials: 'MATERIAL',
  'material-categories': 'MATERIALCATEGORY',
  'film-categories': 'FILMCATEGORY',
  'film-types': 'FILMTYPE',
  'product-types': 'PRODUCTTYPE',
  brands: 'BRAND',
  models: 'MODEL',
  'model-categories': 'MODELCATEGORY',
  'model-cut-files': 'MODELCUTFILE',
  'cut-patterns': 'CUTPATTERN',
  'qr-series': 'DEALERMASTERQR',
  inventory: 'INVENTORY',
  contacts: 'CONTACT',
  addresses: 'ADDRESS',
};

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // We only care about mutations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      if (req.url.includes('/auth/login')) return next.handle(); // Skip auth

      return next.handle().pipe(
        tap((data) => {
          // Fire and forget
          const user = req.user;
          const url = (req.originalUrl || req.url || '').split('?')[0]; // e.g. /api/organizations
          const parts = url.split('/').filter(Boolean);

          // If the path starts with 'api', strip it to get the actual resource name
          if (parts[0]?.toLowerCase() === 'api') {
            parts.shift();
          }

          const rawEntity = parts[0] || 'Unknown';
          const normalizedKey = rawEntity.toLowerCase();
          const entity = ENTITY_MAP[normalizedKey] || (rawEntity.charAt(0).toUpperCase() + rawEntity.slice(1));

          let action = 'UPDATE';
          if (method === 'POST') action = 'CREATE';
          if (method === 'DELETE') action = 'DELETE';

          let entityId = 'System Route';
          if (method === 'POST' && data) {
            entityId = (data.id || data.organization?.id || data.org?.id || 'System Route').toString();
          } else if (parts[1] && !['onboard-retailer', 'create'].includes(parts[1])) {
            entityId = parts[1];
          }

          const details = {
            ...(req.body || {}),
            name: req.body?.storeName || req.body?.name || req.body?.email || req.body?.title || req.body?.label,
          };

          this.auditLogsService.createLog({
            userId: user?.id || null,
            action,
            entity,
            entityId,
            details,
          }).catch((err: any) => console.error('Audit Log Save Failed:', err));
        }),
      );
    }

    return next.handle();
  }
}
