import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from './auth.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthentificatedRequest } from 'express'; // This might need to be actual express.Request if AuthenticatedRequest is not globally defined
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { SessionService } from './session/session.service'; // Added
import { BadRequestException, UnauthorizedException } from '@nestjs/common'; // Added for new endpoint

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService, // Inject ConfigService
    private readonly sessionService: SessionService, // Injected
  ) {}

  /**
   * Handles user login. If 2FA is enabled for the user, this endpoint may return
   * a response indicating that a 2FA code is required, rather than a session token directly.
   * @param signInDto DTO containing user credentials (email, password).
   * @param req The Express request object, used for IP address and User-Agent.
   * @returns Login result, which might be a session token or a 2FA challenge.
   */
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: CreateUserDto }) // Ensure CreateUserDto has email and password
  @ApiResponse({ status: 200, description: 'User successfully logged in, or 2FA step required.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: CreateUserDto, @Request() req: any) { // `any` for req to simplify; consider a typed request.
    const ipAddress = req.ip; // Capture IP address for security logging/session management.
    const userAgent = req.headers['user-agent']; // Capture User-Agent for session management.

    // AuthService.signIn handles credential validation and 2FA checks.
    // It will return a session token directly if 2FA is not enabled or not required for this login,
    // or an indicator that 2FA is required (e.g., by returning a specific status or payload).
    const result = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
      ipAddress,
      userAgent,
    );
    return result;
  }

  /**
   * Handles new user registration.
   * @param signUpDto DTO containing user details (name, email, password).
   * @param req The Express request object, used for IP address and User-Agent.
   * @returns The newly created user object (typically without sensitive data like password).
   */
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async signUp(@Body() signUpDto: CreateUserDto, @Request() req: any) { // `any` for req to simplify.
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // AuthService.signUp handles user creation and password hashing.
    const result = await this.authService.signUp(
      signUpDto.name,
      signUpDto.email,
      signUpDto.password,
      ipAddress,
      userAgent,
    );

    // Emit an event to send a welcome email, for example.
    // This decouples email sending from the registration flow.
    this.eventEmitter.emit('user.welcome', {
      name: signUpDto.name,
      email: signUpDto.email,
    });
    return result;
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * Requires a valid JWT via AuthGuard.
   * @param req The authenticated request object, which includes the user payload.
   * @returns The user object attached to the request by AuthGuard.
   */
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth() // Indicates that JWT authentication is required.
  @ApiResponse({ status: 200, description: 'Returns current user profile.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @UseGuards(AuthGuard) // Protects the route, ensuring only authenticated users can access it.
  @Get('profile')
  getProfile(@Request() req: AuthentificatedRequest) { // AuthenticatedRequest should type req.user
    // The user object is attached to the request by the AuthGuard after validating the JWT.
    return req.user;
  }

  /**
   * Initiates the password reset process for a user.
   * Generates a password reset token and sends a reset link to the user's email.
   * @param body Object containing the user's email.
   * @returns A message indicating that the reset link has been sent.
   * @throws {NotFoundException} If no user is found with the given email.
   */
  @ApiOperation({ summary: 'Send password reset link to email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset link sent.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password/send')
  async resetPassword(@Body() body: { email: string }) {
    const user = await this.usersService.getByEmail(body.email);
    if (!user) {
      // It's important not to reveal if an email exists in the system for security reasons,
      // but for this example, we throw NotFoundException. Consider a generic message in production.
      throw new NotFoundException('User not found');
    }

    // Generate a unique, time-limited token for password reset.
    const token = await this.authService.generateResetToken(user.email);

    // Emit an event to handle sending the email with the reset link.
    // This keeps email sending logic separate from the controller.
    this.eventEmitter.emit('user.reset-password', {
      name: user.name,
      email: user.email,
      link: `${this.configService.get<string>('APP_WEB_URL')}/reset-password?token=${encodeURIComponent(token)}`, // Construct reset link
    });
    return {
      message: 'If your email address is in our database, you will receive a password reset link shortly.', // More secure message
    };
  }

  /**
   * Verifies a password reset token and allows the user to set a new password.
   * @param body Object containing the reset token and the new password.
   * @returns A message indicating successful password reset.
   * @throws {NotFoundException} If the token is invalid/expired or the user is not found.
   */
  @ApiOperation({ summary: 'Verify reset token and set new password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['token', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiNotFoundResponse({ description: 'Token or user not found.' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password/verify')
  async verifyResetPassword(@Body() body: { token: string; password: string }) {
    // Validate the reset token.
    const email = await this.authService.verifyResetToken(body.token);
    if (!email) {
      throw new NotFoundException('Invalid or expired password reset token.');
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) {
      // Should not happen if token was valid, but as a safeguard.
      throw new NotFoundException('User not found.');
    }

    // Update the user's password.
    await this.usersService.updatePassword(
      user.id,
      body.password,
    );
    // The updated password object is logged for debugging, consider removing in production.
    // console.log(password); 

    // Invalidate the reset token after successful use.
    await this.authService.deleteResetToken(body.token);

    return {
      email, // Optionally return the email for confirmation on the frontend.
      message: 'Password reset successfully.',
    };
  }

  /**
   * Sends an email verification link to the user.
   * Useful for users who didn't verify their email during registration or if the link expired.
   * @param body Object containing the user's email.
   * @returns A message indicating that the verification link has been sent.
   * @throws {NotFoundException} If no user is found with the given email.
   */
  @ApiOperation({ summary: 'Send email verification link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verified email link sent.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @Post('confirmation/send')
  async sendVerifiedEmail(@Body() body: { email: string }) {
    const user = await this.usersService.getByEmail(body.email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Generate a new verification token (can reuse password reset token logic if suitable).
    const token = await this.authService.generateResetToken(user.email); // Assuming a generic token generation

    // Emit an event to handle sending the email.
    this.eventEmitter.emit('user.verify-email', {
      name: user.name,
      email: user.email,
      link: `${this.configService.get<string>('APP_WEB_URL')}/verify-email?token=${encodeURIComponent(token)}`, // Construct verification link
    });
    return {
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  /**
   * Verifies a user's email address using a token sent to them.
   * @param body Object containing the verification token.
   * @returns A message indicating successful email verification.
   * @throws {NotFoundException} If the token is invalid/expired or the user is not found.
   */
  @ApiOperation({ summary: 'Verify email token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiNotFoundResponse({ description: 'Token or user not found.' })
  @Post('confirmation/verify')
  async verifyEmail(@Body() body: { token: string }) {
    // Validate the verification token.
    const email = await this.authService.verifyResetToken(body.token); // Reusing reset token logic
    if (!email) {
      throw new NotFoundException('Invalid or expired verification token.');
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Mark the user's email as verified.
    await this.usersService.update(user.id, { verified: true });
    // Invalidate the token after use.
    await this.authService.deleteResetToken(body.token);

    return {
      email, // Optionally return email for frontend confirmation.
      message: 'Email verified successfully.',
    };
  }

  /**
   * Extracts the JWT token from the Authorization header.
   * @param request The Express request object.
   * @returns The token string if present and type is Bearer, otherwise undefined.
   */
  private extractTokenFromHeader(request: any): string | undefined { // `any` for request; consider a more specific type.
    const [type, tokenValue] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? tokenValue : undefined;
  }

  /**
   * Logs out the currently authenticated user by invalidating their session token.
   * @param req The authenticated request object.
   */
  @UseGuards(AuthGuard) // Ensures only authenticated users can logout.
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT) // Standard practice for logout to return 204.
  @ApiOperation({ summary: 'Log out current user session' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized if no valid token is provided.' })
  async logout(@Request() req: any) { // `any` for req; AuthenticatedRequest would be better.
    const token = this.extractTokenFromHeader(req);
    if (token) {
      // Invalidate the session associated with this token.
      // This might involve adding the token to a denylist or removing a session record.
      await this.sessionService.invalidateSession(token);
    }
    // No explicit content is returned, HttpStatus.NO_CONTENT (204) is sent.
  }
}