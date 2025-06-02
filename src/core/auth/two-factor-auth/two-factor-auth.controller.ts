import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  Inject,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // Ensure @nestjs/cache-manager is installed

import { AuthGuard } from '../auth.guard'; // Assuming AuthGuard is in ../auth.guard
import { TwoFactorAuthService } from './two-factor-auth.service';
import { UsersService } from '../../users/users.service'; // Assuming this path
import { User } from '../../users/entities/user.entity'; // For req.user typing
import { TwoFactorAuthenticationCodeDto } from './dto/two-factor-authentication-code.dto';

// Define a basic AuthenticatedRequest interface
interface AuthenticatedRequest extends Request {
  user: User; // Or a more specific User DTO
}

@ApiTags('Auth Two Factor')
@ApiBearerAuth()
@Controller('auth/2fa')
@UseGuards(AuthGuard)
export class TwoFactorAuthController {
  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new 2FA secret for the user to scan' })
  @ApiResponse({
    status: 200,
    description: 'Returns OTP Auth URL. Client should generate QR code.',
    schema: { type: 'object', properties: { otpauthUrl: { type: 'string' } } },
  })
  async generateSecret(
    @Request() req: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const { otpauthUrl, secret } =
      await this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(
        req.user,
      );

    // Store the secret temporarily in cache for verification in the turn-on step
    // TTL is 5 minutes (300 seconds)
    await this.cacheManager.set(`2fa_secret_${req.user.id}`, secret, 300);

    // It's common to return the otpauthUrl and let the frontend render the QR code
    response.status(HttpStatus.OK).json({ otpauthUrl });
  }

  @Post('turn-on')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Turn on 2FA by verifying a code from the authenticator app',
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ status: 200, description: '2FA successfully enabled.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid 2FA code or secret expired.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized (user not found or issue with user session).'})
  async turnOnTwoFactorAuthentication(
    @Request() req: AuthenticatedRequest,
    @Body() { twoFactorAuthenticationCode }: TwoFactorAuthenticationCodeDto,
  ) {
    const userId = req.user.id;
    const tempSecret = await this.cacheManager.get<string>(`2fa_secret_${userId}`);

    if (!tempSecret) {
      throw new BadRequestException('2FA secret expired or not generated. Please try generating a new QR code.');
    }

    const isCodeValid = this.twoFactorAuthService.isTwoFactorCodeValid(
      twoFactorAuthenticationCode,
      tempSecret,
    );

    if (!isCodeValid) {
      throw new BadRequestException('Invalid two-factor authentication code.');
    }

    // Code is valid, persist the secret and enable 2FA for the user
    await this.usersService.update(userId, {
      twoFactorAuthenticationSecret: tempSecret,
      isTwoFactorAuthenticationEnabled: true,
    });

    // Remove the temporary secret from cache
    await this.cacheManager.del(`2fa_secret_${userId}`);

    return { message: 'Two-factor authentication has been enabled successfully.' };
  }

  @Post('turn-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Turn off 2FA by verifying a code from the authenticator app',
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ status: 200, description: '2FA successfully disabled.' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.'})
  @ApiResponse({ status: 404, description: 'User not found.'})
  async turnOffTwoFactorAuthentication(
    @Request() req: AuthenticatedRequest,
    @Body() { twoFactorAuthenticationCode }: TwoFactorAuthenticationCodeDto,
  ) {
    const userId = req.user.id;
    // Fetch the full user entity to access the 2FA secret
    const user = await this.usersService.findOne(userId); // Use findOne as per UsersService
    if (!user) {
        // This case should ideally be handled by AuthGuard or a general user check
        throw new NotFoundException('User not found.');
    }

    if (!user.isTwoFactorAuthenticationEnabled || !user.twoFactorAuthenticationSecret) {
      throw new BadRequestException('Two-factor authentication is not currently enabled for your account.');
    }

    const isCodeValid = this.twoFactorAuthService.isTwoFactorCodeValid(
      twoFactorAuthenticationCode,
      user.twoFactorAuthenticationSecret,
    );

    if (!isCodeValid) {
      throw new BadRequestException('Invalid two-factor authentication code.');
    }

    // Code is valid, disable 2FA for the user
    await this.usersService.update(userId, {
      twoFactorAuthenticationSecret: null,
      isTwoFactorAuthenticationEnabled: false,
    });

    return { message: 'Two-factor authentication has been disabled successfully.' };
  }
}
