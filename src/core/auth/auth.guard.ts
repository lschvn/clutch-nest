import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt'; // No longer directly used here
// import { jwtConstants } from './constants'; // No longer directly used here
import { Request } from 'express';
import { SessionService } from './session/session.service'; // Import SessionService

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {} // Inject SessionService

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>(); // Typed request
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No authentication token provided.');
    }
    try {
      const user = await this.sessionService.validateSession(token);
      if (!user) {
        // validateSession returning null means token is invalid or session expired
        throw new UnauthorizedException('Invalid or expired session.');
      }
      // Assign the full user object (from session validation) to the request
      request['user'] = user;
    } catch (error) {
      // Catch errors from validateSession or if it throws, or if UnauthorizedException was thrown above
      // console.error('AuthGuard Error:', error); // Optional: for debugging
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw if it's already the correct type
      }
      throw new UnauthorizedException('Authentication failed.'); // General fallback
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
