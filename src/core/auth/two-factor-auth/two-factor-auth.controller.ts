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
  UnauthorizedException, // Added
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse, // Added
  ApiUnauthorizedResponse, // Added
} from '@nestjs/swagger';
import { Response } from 'express';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // Ensure @nestjs/cache-manager is installed

import { AuthGuard } from '../auth.guard'; // Assuming AuthGuard is in ../auth.guard
import { TwoFactorAuthService } from './two-factor-auth.service';
import { UsersService } from '../../users/users.service'; // Assuming this path
import { User } from '../../users/entities/user.entity'; // For req.user typing
import { TwoFactorAuthenticationCodeDto } from './dto/two-factor-authentication-code.dto';
import { LoginTwoFactorDto } from '../dto/login-two-factor.dto'; // Added
import { SessionService } from '../session/session.service'; // Added

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
    private readonly sessionService: SessionService, // Injected
  ) {}

  /**
   * Authenticates a user using a 2FA code after the initial login attempt (which indicated 2FA was required).
   * This endpoint is typically called when the primary login (`/auth/login`) returns a status
   * indicating that 2FA is enabled and required for the user.
   *
   * @param loginTwoFactorDto - The DTO containing the `userId` and the `twoFactorAuthenticationCode`.
   * @param req - The Express request object, used here to extract IP address and User-Agent for session creation.
   * @returns An object containing the `sessionToken` and a `user` object (with sensitive information stripped).
   * @throws {NotFoundException} If the user specified by `userId` is not found.
   * @throws {BadRequestException} If 2FA is not enabled for the user.
   * @throws {UnauthorizedException} If the provided `twoFactorAuthenticationCode` is invalid.
   */
  @ApiOperation({ summary: 'Authenticate with 2FA code after successful primary login' })
  @ApiBody({ type: LoginTwoFactorDto })
  @ApiResponse({ status: 200, description: 'User successfully authenticated with 2FA, session created.' })
  @ApiUnauthorizedResponse({ description: 'Invalid 2FA code or user not found.' })
  @ApiNotFoundResponse({ description: 'User not found.'})
  // @BadRequestException('2FA not enabled for this user or other bad request.') // Removed this as it's handled in logic
  @HttpCode(HttpStatus.OK)
  @Post('authenticate')
  async authenticateTwoFactor(
    @Body() loginTwoFactorDto: LoginTwoFactorDto,
    @Request() req: any, // Using `any` for Request to simplify access to IP and User-Agent; consider a typed request if available.
  ) {
    const { userId, twoFactorAuthenticationCode } = loginTwoFactorDto;

    // Verify user existence
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found or invalid user ID.');
    }

    // Check if 2FA is actually enabled for this user as a safeguard.
    if (!user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled for this user.');
    }

    // For email-based 2FA, verify the code sent to the user's email.
    // This might involve checking a code against a stored value in cache or database.
    const isCodeValid = await this.twoFactorAuthService.verifyEmailLoginCode(
        userId,
        twoFactorAuthenticationCode,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code.');
    }

    // If code is valid, create a new session for the user.
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const sessionToken = await this.sessionService.createSession(user.id, ipAddress, userAgent);

    // Return non-sensitive user information along with the session token.
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

  /**
   * Generates a new 2FA secret (for authenticator apps like Google Authenticator) and its corresponding OTP Auth URL.
   * The OTP Auth URL can be converted into a QR code by the frontend for the user to scan.
   * The generated secret is temporarily stored in cache, awaiting verification by the `turnOnTwoFactorAuthentication` endpoint.
   *
   * @param req - The authenticated request, containing the user object.
   * @param response - The Express response object, used to send the OTP Auth URL.
   */
  @Post('generate')
  @ApiOperation({ summary: 'Generate a new QR code secret for authenticator app 2FA' })
  @ApiResponse({
    status: 200,
    description: 'Returns OTP Auth URL. Client should generate QR code.',
    schema: { type: 'object', properties: { otpauthUrl: { type: 'string' } } },
  })
  async generateSecret(
    @Request() req: AuthenticatedRequest, // Requires AuthGuard to populate req.user
    @Res() response: Response,
  ) {
    const { otpauthUrl, secret } =
      await this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(
        req.user, // User object obtained from AuthGuard
      );

    // Store the generated 2FA secret temporarily in cache.
    // This secret will be used to verify the code provided by the user when they try to turn on 2FA.
    // A Time-To-Live (TTL) is set to ensure the secret doesn't persist indefinitely if not used.
    await this.cacheManager.set(`2fa_secret_${req.user.id}`, secret, 300); // 300 seconds = 5 minutes

    // Return the OTP Auth URL. The frontend will use this to generate a QR code.
    response.status(HttpStatus.OK).json({ otpauthUrl });
  }

  /**
   * Turns on 2FA for the user after they scan the QR code and provide a valid code
   * from their authenticator app.
   * This method verifies the provided code against the temporarily stored secret.
   *
   * @param req - The authenticated request, containing the user object.
   * @param twoFactorAuthenticationCodeDto - DTO containing the 2FA code from the user's app.
   * @returns A success message.
   * @throws {BadRequestException} If the secret has expired or the code is invalid.
   */
  @Post('turn-on')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Turn on authenticator app 2FA by verifying the generated code',
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ status: 200, description: 'Authenticator app 2FA successfully enabled.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid 2FA code or secret expired.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized (user not found or issue with user session).'})
  async turnOnTwoFactorAuthentication(
    @Request() req: AuthenticatedRequest, // Requires AuthGuard
    @Body() { twoFactorAuthenticationCode }: TwoFactorAuthenticationCodeDto,
  ) {
    const userId = req.user.id;
    // Retrieve the temporary 2FA secret stored during the 'generate' step.
    const tempSecret = await this.cacheManager.get<string>(`2fa_secret_${userId}`);

    if (!tempSecret) {
      // This can happen if the user takes too long to enter the code or never started the generate process.
      throw new BadRequestException('2FA secret expired or not found. Please try generating a new QR code.');
    }

    // Validate the code provided by the user against the stored temporary secret.
    const isCodeValid = this.twoFactorAuthService.isTwoFactorCodeValid(
      twoFactorAuthenticationCode,
      tempSecret,
    );

    if (!isCodeValid) {
      throw new BadRequestException('Invalid two-factor authentication code.');
    }

    // If the code is valid, permanently store the 2FA secret with the user record
    // and mark 2FA as enabled.
    await this.usersService.update(userId, {
      twoFactorAuthenticationSecret: tempSecret, // Persist the validated secret
      isTwoFactorAuthenticationEnabled: true,
    });

    // Clean up by removing the temporary secret from the cache.
    await this.cacheManager.del(`2fa_secret_${userId}`);

    return { message: 'Two-factor authentication has been enabled successfully.' };
  }

  /**
   * Turns off 2FA for the user. Requires a valid 2FA code from their authenticator app
   * to confirm the action.
   *
   * @param req - The authenticated request, containing the user object.
   * @param twoFactorAuthenticationCodeDto - DTO containing the 2FA code from the user's app.
   * @returns A success message.
   * @throws {NotFoundException} If the user is not found.
   * @throws {BadRequestException} If 2FA is not enabled or the code is invalid.
   */
  @Post('turn-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Turn off authenticator app 2FA by verifying a current code',
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ status: 200, description: 'Authenticator app 2FA successfully disabled.' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.'})
  @ApiResponse({ status: 404, description: 'User not found.'})
  async turnOffTwoFactorAuthentication(
    @Request() req: AuthenticatedRequest, // Requires AuthGuard
    @Body() { twoFactorAuthenticationCode }: TwoFactorAuthenticationCodeDto,
  ) {
    const userId = req.user.id;
    // Fetch the full user entity to access their persisted 2FA secret.
    const user = await this.usersService.findOne(userId);
    if (!user) {
        // This should ideally be caught by AuthGuard, but as a safeguard:
        throw new NotFoundException('User not found.');
    }

    // Check if 2FA is actually enabled and a secret exists.
    if (!user.isTwoFactorAuthenticationEnabled || !user.twoFactorAuthenticationSecret) {
      throw new BadRequestException('Two-factor authentication is not currently enabled for this account.');
    }

    // Validate the provided 2FA code against the user's stored secret.
    const isCodeValid = this.twoFactorAuthService.isTwoFactorCodeValid(
      twoFactorAuthenticationCode,
      user.twoFactorAuthenticationSecret, // Use the persisted secret for verification
    );

    if (!isCodeValid) {
      throw new BadRequestException('Invalid two-factor authentication code.');
    }

    // If the code is valid, disable 2FA by clearing the secret and updating the flag.
    await this.usersService.update(userId, {
      twoFactorAuthenticationSecret: null, // Remove the secret
      isTwoFactorAuthenticationEnabled: false, // Set 2FA to disabled
    });

    return { message: 'Two-factor authentication has been disabled successfully.' };
  }
}
