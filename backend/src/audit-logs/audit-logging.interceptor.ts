import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

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
          const url = req.url; // e.g. /users/123
          const parts = url.split('/').filter(Boolean);
          const rawEntity = parts[0] || 'Unknown';
          const entity = rawEntity.charAt(0).toUpperCase() + rawEntity.slice(1);

          let action = 'UPDATE';
          if (method === 'POST') action = 'CREATE';
          if (method === 'DELETE') action = 'DELETE';

          let entityId = 'System Route';
          if (method === 'POST' && data && data.id) {
            entityId = data.id.toString();
          } else if (parts[1]) {
            entityId = parts[1];
          }

          this.auditLogsService.createLog({
            userId: user?.id || null,
            action,
            entity,
            entityId,
            details: req.body || {},
          }).catch((err: any) => console.error('Audit Log Save Failed:', err));
        }),
      );
    }

    return next.handle();
  }
}
