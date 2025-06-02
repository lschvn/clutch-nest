import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service'; // Assuming this path is correct
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // Added
import { EventEmitter2 } from '@nestjs/event-emitter'; // Added
import * as crypto from 'crypto'; // Added

@Injectable()
export class TwoFactorAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // Injected CACHE_MANAGER
    private readonly eventEmitter: EventEmitter2, // Injected EventEmitter2
  ) {}

  // This method is for authenticator app based 2FA (TOTP)
  async generateTwoFactorAuthenticationSecret(user: User): Promise<{
    secret: string;
    otpauthUrl: string;
  }> {
    const secret = authenticator.generateSecret(); // This is for TOTP
    const appName =
      this.configService.get<string>('TWO_FACTOR_AUTHENTICATION_APP_NAME') ||
      'MyApp';

    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    return {
      secret,
      otpauthUrl,
    };
  }

  // This method is for authenticator app based 2FA (TOTP)
  isTwoFactorCodeValid(
    twoFactorCode: string,
    userSecret: string, // This is the TOTP secret
  ): boolean {
    if (!userSecret) {
      return false;
    }
    return authenticator.verify({
      token: twoFactorCode,
      secret: userSecret,
    });
  }

  // --- Methods for Email-based 2FA Login Codes ---

  private hashEmailCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async generateAndCacheEmailLoginCode(userId: number): Promise<string> {
    // Generate a 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = this.hashEmailCode(code);

    // Store the hashed code in cache for 5 minutes (300000 ms)
    await this.cacheManager.set(`2fa_login_code:${userId}`, hashedCode, 300000);
    
    return code; // Return the plain code for emailing
  }

  async verifyEmailLoginCode(userId: number, providedCode: string): Promise<boolean> {
    const cacheKey = `2fa_login_code:${userId}`;
    const cachedHashedCode = await this.cacheManager.get<string>(cacheKey);

    if (!cachedHashedCode) {
      return false; // Code expired or not found
    }

    const hashedProvidedCode = this.hashEmailCode(providedCode);
    const isValid = hashedProvidedCode === cachedHashedCode;

    if (isValid) {
      // Code is valid and used, remove from cache
      await this.cacheManager.del(cacheKey);
    }

    return isValid;
  }
}
