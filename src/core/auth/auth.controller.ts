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
import { AuthentificatedRequest } from 'express';
import { UsersService } from 'src/core/users/users.service';
import { ConfigService } from '@nestjs/config'; // Import ConfigService

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) {}

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: CreateUserDto) {
    const result = await this.authService.signIn(
      signInDto.email,
      signInDto.password,
    );
    return result;
  }

  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async signUp(@Body() signUpDto: CreateUserDto) {
    const result = await this.authService.signUp(
      signUpDto.name,
      signUpDto.email,
      signUpDto.password,
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
}