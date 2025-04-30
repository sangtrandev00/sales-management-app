import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Headers,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { SessionService } from '../common/services/session.service';
import { SessionGuard } from '../common/guards/session.guard';
import { v4 as uuidv4 } from 'uuid';
import { MemcachedService } from '../common/services/memcached.service';

interface LoginDto {
  userId: number;
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly memcachedService: MemcachedService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // In a real application, you would validate credentials here
    const session = await this.sessionService.createSession(
      loginDto.userId,
      loginDto.email,
    );

    return {
      sessionId: session.id,
      message: 'Login successful',
    };
  }

  @Post('logout')
  async logout(@Headers('session-id') sessionId: string) {
    if (!sessionId) {
      throw new UnauthorizedException('No session ID provided');
    }

    await this.sessionService.destroySession(sessionId);
    return {
      message: 'Logout successful',
    };
  }

  @Get('profile')
  @UseGuards(SessionGuard)
  async getProfile(@Req() request: any) {
    // The session is automatically attached to the request by the SessionGuard
    const session = request.session;

    // Example of storing additional data in the session
    await this.sessionService.setSessionData(
      session.id,
      'lastProfileAccess',
      new Date(),
    );

    return {
      userId: session.userId,
      email: session.email,
      sessionCreated: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Request a password reset (generates and stores a token)
   */
  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string) {
    // In a real app, validate email and check if user exists
    const token = uuidv4();
    const key = `password_reset:${token}`;
    await this.memcachedService.setTemporaryToken(key, { email }, 600); // 10 min
    // In a real app, send token to user's email
    return { message: 'Password reset token generated', token };
  }

  /**
   * Verify a password reset token
   */
  @Post('verify-password-reset')
  async verifyPasswordReset(@Body('token') token: string) {
    const key = `password_reset:${token}`;
    const data = await this.memcachedService.getTemporaryToken<{
      email: string;
    }>(key);
    if (!data) {
      return { valid: false, message: 'Invalid or expired token' };
    }
    // Optionally, delete the token after use
    await this.memcachedService.deleteTemporaryToken(key);
    return { valid: true, email: data.email };
  }
}
