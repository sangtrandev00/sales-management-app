import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.headers['session-id'];

    if (!sessionId) {
      throw new UnauthorizedException('No session ID provided');
    }

    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Extend session TTL on successful authentication
    await this.sessionService.extendSession(sessionId);

    // Attach session to request for use in controllers
    request.session = session;
    return true;
  }
}
