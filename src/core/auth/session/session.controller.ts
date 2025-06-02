import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth.guard'; // Assuming AuthGuard is in ../auth.guard
import { SessionService } from './session.service';
import { User } from '../../users/entities/user.entity'; // For req.user typing

// Define a basic AuthenticatedRequest interface if not already globally available
interface AuthenticatedRequest extends Request {
  user: User; // Or a more specific User DTO if you have one for authenticated users
}

@ApiTags('Auth Sessions')
@ApiBearerAuth()
@Controller('auth/sessions')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('/')
  @ApiOperation({ summary: "List current user's active sessions" })
  @ApiResponse({ status: 200, description: 'List of active sessions.' })
  async getUserSessions(@Request() req: AuthenticatedRequest) {
    // req.user.id should be available if AuthGuard is set up correctly
    return this.sessionService.getUserSessions(req.user.id);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden to revoke session.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Request() req: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const session = await this.sessionService.findSessionById(sessionId);

    if (!session) {
      // Or handle this in the service, but controller can also return 404
      throw new ForbiddenException(
        'Session not found or you do not have permission.',
      );
    }

    // Security Check: Ensure the session belongs to the authenticated user
    if (session.user.id !== req.user.id) {
      throw new ForbiddenException(
        'You are not authorized to revoke this session.',
      );
    }

    await this.sessionService.invalidateSession(session.token);
    // invalidateSession in service already handles non-existent tokens gracefully
  }
}
