import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If token is missing, expired, or invalid, do NOT throw 401.
    // Simply set req.user to null so public endpoints can still proceed.
    return user || null;
  }
}
