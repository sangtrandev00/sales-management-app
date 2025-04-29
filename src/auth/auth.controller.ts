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

interface LoginDto {
  userId: number;
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly sessionService: SessionService) {}

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
}
