import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '../users/users.service';
import { AuthentificatedRequest } from 'express';

/**
 * Interceptor that automatically grants daily bonus to authenticated users
 * when they make requests after 24 hours since their last connection.
 *
 * This interceptor checks if a user is eligible for the daily bonus (100 credits)
 * based on their last connection timestamp. If eligible, it grants the bonus
 * and updates the user's balance and last connection time.
 *
 * @implements {NestInterceptor}
 */
@Injectable()
export class DailyBonusInterceptor implements NestInterceptor {
  /**
   * Creates an instance of DailyBonusInterceptor.
   * @param {UsersService} usersService - Service for user operations including bonus granting
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Intercepts incoming requests to check and grant daily bonus if eligible.
   *
   * @param {ExecutionContext} context - The execution context containing request information
   * @param {CallHandler} next - The next handler in the interceptor chain
   * @returns {Promise<Observable<any>>} The observable from the next handler
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Extract the authenticated request from the execution context
    const request = context.switchToHttp().getRequest<AuthentificatedRequest>();
    const user = request.user;

    // Skip bonus check for public routes or unauthenticated users
    if (!user || !user.id) {
      return next.handle();
    }

    // Get current timestamp for comparison
    const now = new Date();

    // Parse the user's last connection timestamp, if it exists
    const lastConnection = user.lastConnection
      ? new Date(user.lastConnection)
      : null;

    // Check if user is eligible for daily bonus (24 hours since last connection)
    const shouldAwardBonus =
      !lastConnection ||
      (now.getTime() - lastConnection.getTime()) / (1000 * 60 * 60) >= 24;

    // Grant bonus if eligible and update the request user object
    if (shouldAwardBonus) {
      const updatedUser = await this.usersService.grantDailyBonus(user.id);
      if (updatedUser) {
        // Update the request user object with the latest user data
        request.user = updatedUser;
      }
    }

    // Continue with the request processing
    return next.handle();
  }
}
