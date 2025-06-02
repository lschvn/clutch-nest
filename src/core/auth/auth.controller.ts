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
import { UsersService } from 'src/core/users/users.service';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'; // Added
import { SessionService } from './session/session.service'; // Added
import { LoginTwoFactorDto } from './dto/login-two-factor.dto'; // Added
import { BadRequestException, UnauthorizedException } from '@nestjs/common'; // Added for new endpoint

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService, // Inject ConfigService
    private readonly twoFactorAuthService: TwoFactorAuthService, // Injected
    private readonly sessionService: SessionService, // Injected
  ) {}

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: CreateUserDto }) // Assuming CreateUserDto has email and password
  @ApiResponse({ status: 200, description: 'User successfully logged in or 2FA required.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: CreateUserDto, @Request() req: any) { // req type can be more specific e.g. express.Request
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
      ipAddress,
      userAgent,
    );
    return result;
  }

  @ApiOperation({ summary: 'Authenticate with 2FA code after login' })
  @ApiBody({ type: LoginTwoFactorDto })
  @ApiResponse({ status: 200, description: 'User successfully authenticated with 2FA.' })
  @ApiUnauthorizedResponse({ description: 'Invalid 2FA code or user not found.' })
  @ApiNotFoundResponse({ description: 'User not found.'})
  @BadRequestException('2FA not enabled for this user or other bad request.')
  @HttpCode(HttpStatus.OK)
  @Post('2fa/authenticate')
  async authenticateTwoFactor(
    @Body() loginTwoFactorDto: LoginTwoFactorDto,
    @Request() req: any, // For IP and UserAgent
  ) {
    const { userId, twoFactorAuthenticationCode } = loginTwoFactorDto;

    const user = await this.usersService.findOne(userId); // Ensure UsersService has findOne
    if (!user) {
      throw new UnauthorizedException('User not found or invalid user ID.');
    }

    if (!user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled for this user.');
    }
    // No longer need user.twoFactorAuthenticationSecret for email-based 2FA login verification

    const isCodeValid = await this.twoFactorAuthService.verifyEmailLoginCode(
        userId, // Pass userId to identify the cached code
        twoFactorAuthenticationCode,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code.');
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const sessionToken = await this.sessionService.createSession(user.id, ipAddress, userAgent);

    // Return only non-sensitive user information
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
    };

    return {
      sessionToken,
      user: safeUser,
    };
  }

  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async signUp(@Body() signUpDto: CreateUserDto, @Request() req: any) { // Added @Request() req
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.signUp(
      signUpDto.name,
      signUpDto.email,
      signUpDto.password,
      ipAddress, // Pass ipAddress
      userAgent,  // Pass userAgent
    );
    this.eventEmitter.emit('user.welcome', {
      name: signUpDto.name,
      email: signUpDto.email,
    });
    return result;
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Returns current user profile.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: AuthentificatedRequest) {
    return req.user;
  }

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
      throw new NotFoundException('User not found');
    }

    const token = await this.authService.generateResetToken(user.email);
    this.eventEmitter.emit('user.reset-password', {
      name: user.name,
      email: user.email,
      link: `${this.configService.get<string>('APP_WEB_URL')}/reset-password?token=${encodeURIComponent(token)}`,
    });
    return {
      message: 'Reset password link sent',
    };
  }

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
    const email = await this.authService.verifyResetToken(body.token);
    if (!email) {
      throw new NotFoundException('Token not found');
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const password = await this.usersService.updatePassword(
      user.id,
      body.password,
    );
    console.log(password);
    await this.authService.deleteResetToken(body.token);

    return {
      email,
      message: 'Password reset successfully',
    };
  }

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
      throw new NotFoundException('User not found');
    }

    const token = await this.authService.generateResetToken(user.email);
    this.eventEmitter.emit('user.verify-email', {
      name: user.name,
      email: user.email,
      link: `${this.configService.get<string>('APP_WEB_URL')}/verify-email?token=${encodeURIComponent(token)}`,
    });
    return {
      message: 'Verified email link sent',
    };
  }

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
    const email = await this.authService.verifyResetToken(body.token);
    if (!email) {
      throw new NotFoundException('Token not found');
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.update(user.id, { verified: true });
    await this.authService.deleteResetToken(body.token);

    return {
      email,
      message: 'Email verified successfully',
    };
  }

  // Helper method to extract token for logout
  private extractTokenFromHeader(request: any): string | undefined { // Using 'any' for request type for simplicity here
    const [type, tokenValue] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? tokenValue : undefined;
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out current user session' })
  @ApiBearerAuth() // Indicates that this endpoint expects a Bearer token
  @ApiResponse({ status: 204, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() req: any) { // req type can be more specific e.g. express.Request
    const token = this.extractTokenFromHeader(req);
    if (token) {
      await this.sessionService.invalidateSession(token);
    }
    // No explicit return, HttpStatus.NO_CONTENT handles sending a 204 response.
  }
}