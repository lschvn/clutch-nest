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

@ApiTags('Two-Factor Authentication')
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
  @ApiOperation({ 
    summary: 'Complete 2FA authentication after primary login',
    description: `This endpoint completes the two-factor authentication flow after a successful primary login.

**Flow Overview:**
1. User provides email/password to /auth/login
2. If 2FA is enabled, login returns { twoFactorRequired: true, userId: "..." }
3. System sends 2FA code via email to user
4. User receives email with 6-digit code
5. Frontend calls this endpoint with userId and 2FA code
6. If valid, returns sessionToken for authenticated requests

**Usage:**
- Only call this after receiving twoFactorRequired: true from /auth/login
- The 2FA code is sent automatically via email when 2FA is required
- Codes expire after a short time for security (typically 5-10 minutes)
- Session token should be stored securely and used for subsequent API calls`
  })
  @ApiBody({ type: LoginTwoFactorDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Two-factor authentication successful. Returns session token and user information.',
    schema: {
      type: 'object',
      properties: {
        sessionToken: { type: 'string', description: 'JWT session token for authenticated requests' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'User ID' },
            email: { type: 'string', description: 'User email address' },
            name: { type: 'string', description: 'User display name' },
            role: { type: 'string', description: 'User role (user/admin)' },
            verified: { type: 'boolean', description: 'Email verification status' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired 2FA code provided.' })
  @ApiNotFoundResponse({ description: 'User ID not found or 2FA not enabled for this user.' })
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
  @ApiOperation({ 
    summary: 'Generate QR code for authenticator app setup',
    description: `Generates a new secret and QR code URL for setting up authenticator app-based 2FA.

**Setup Flow:**
1. User calls this endpoint while authenticated
2. Backend generates a temporary 2FA secret (valid for 5 minutes)
3. Returns otpauthUrl that frontend converts to QR code
4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. User enters 6-digit code from app to /auth/2fa/turn-on to complete setup

**Frontend Implementation:**
- Use a QR code library to convert otpauthUrl to scannable QR code
- Display instructions for users to scan with their authenticator app
- Provide manual setup option by showing the secret key
- Guide user to next step: entering code to enable 2FA

**Security Notes:**
- Secret expires in 5 minutes if not verified
- User must complete setup with turn-on endpoint to activate 2FA
- Old secrets are invalidated when new ones are generated`
  })
  @ApiResponse({
    status: 200,
    description: 'QR code generation successful. Use otpauthUrl to create QR code for user to scan.',
    schema: { 
      type: 'object', 
      properties: { 
        otpauthUrl: { 
          type: 'string',
          description: 'OTP Auth URL to be converted into QR code by frontend',
          example: 'otpauth://totp/YourApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=YourApp'
        } 
      } 
    },
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
  @ApiOperation({
    summary: 'Enable 2FA by verifying authenticator app code',
    description: `Completes 2FA setup by verifying the code from user's authenticator app.

**Activation Flow:**
1. User must have called /auth/2fa/generate first
2. User scanned QR code with authenticator app
3. User enters 6-digit code from their authenticator app
4. This endpoint validates the code and permanently enables 2FA
5. User's account is now protected with two-factor authentication

**Frontend Considerations:**
- Only enable this call after user has scanned QR code
- Provide clear instructions about entering the 6-digit code
- Handle validation errors gracefully (expired codes, invalid format)
- Show success message when 2FA is enabled
- Redirect to security settings or account overview

**Post-Activation:**
- All future logins will require 2FA via email codes
- User can disable 2FA using the turn-off endpoint
- Backup codes should be generated and displayed (if implemented)`
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ 
    status: 200, 
    description: '2FA successfully enabled for user account.',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Two-factor authentication has been enabled successfully.' 
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authenticator code or setup session expired. User must restart from /generate.',
  })
  @ApiResponse({ status: 401, description: 'User session invalid. Re-authentication required.'})
  @HttpCode(HttpStatus.OK)
  @Post('turn-on')
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
  @ApiOperation({
    summary: 'Disable 2FA with authenticator verification',
    description: `Disables two-factor authentication after verifying current authenticator code.

**Deactivation Flow:**
1. User must be authenticated and have 2FA currently enabled
2. User opens their authenticator app for the current 6-digit code
3. User submits the current code to verify they still have access
4. System validates code and disables 2FA protection
5. Account returns to single-factor authentication (password only)

**Security Considerations:**
- Requires valid authenticator code to prevent unauthorized disabling
- Consider requiring additional verification (password re-entry)
- Log this security event for audit purposes
- Notify user via email about 2FA being disabled

**Frontend Implementation:**
- Warn user about reduced security when disabling 2FA
- Clearly explain they need their authenticator app
- Provide option to re-enable 2FA easily
- Show confirmation message after successful disabling`
  })
  @ApiBody({ type: TwoFactorAuthenticationCodeDto })
  @ApiResponse({ 
    status: 200, 
    description: '2FA successfully disabled for user account.',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Two-factor authentication has been disabled successfully.' 
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid authenticator code or 2FA not currently enabled for this account.' 
  })
  @ApiResponse({ status: 401, description: 'User session invalid. Re-authentication required.'})
  @ApiResponse({ status: 404, description: 'User account not found.'})
  @HttpCode(HttpStatus.OK)
  @Post('turn-off')
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
