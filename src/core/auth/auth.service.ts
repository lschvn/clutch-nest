import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SessionService } from './session/session.service';
import { TfaService } from './tfa/tfa.service'; // Updated
import { EventEmitter2 } from '@nestjs/event-emitter'; // Added

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly sessionService: SessionService,
    private readonly tfaService: TfaService, // Injected TfaService
    private readonly eventEmitter: EventEmitter2, // Injected EventEmitter2
  ) {}
  async signIn(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.usersService.getByEmail(email);
    // It's important that getByEmail fetches all necessary fields, including isTwoFactorAuthenticationEnabled and role
    if (!user) {
      throw new UnauthorizedException('Invalid credentials'); // Keep generic for security
    }

    const isPasswordValid = await this.usersService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      // User has 2FA enabled, generate email code and signal client.
      const emailCode = await this.tfaService.generateAndCacheEmailLoginCode(
        user.id,
      );
      this.eventEmitter.emit('auth.2fa.send_login_code', {
        email: user.email,
        name: user.name,
        code: emailCode,
      });
      return {
        twoFactorRequired: true,
        userId: user.id,
      };
    }

    // 2FA is not enabled, proceed to create a session directly.
    const sessionToken = await this.sessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
    );

    // Return only non-sensitive user information
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
      // Do NOT include password, twoFactorAuthenticationSecret, etc.
    };

    return {
      sessionToken,
      user: safeUser,
    };
  }

  async signUp(
    name: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Create the user
    const userEntity = await this.usersService.create({
      name,
      email,
      // password hashing is handled by usersService.create or a pre-save hook in User entity
      // For this example, assuming usersService.create handles hashing if password passed directly.
      // If usersService.hashPassword is needed explicitly before create, that should be done.
      // Based on current UsersService, it seems create() calls hashPassword().
      password: password, // Pass raw password, UsersService.create should handle hashing
      verified: false, // Default for new sign-ups
      // role will be default 'user' as per User entity definition
    });

    // Create a session for the new user
    const sessionToken = await this.sessionService.createSession(
      userEntity.id,
      ipAddress,
      userAgent,
    );

    // Return only non-sensitive user information
    const safeUser = {
      id: userEntity.id,
      email: userEntity.email,
      name: userEntity.name,
      role: userEntity.role, // Ensure role is populated by create or default
      verified: userEntity.verified,
    };

    return {
      sessionToken,
      user: safeUser,
    };
  }

  async generateResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.cacheManager.set(`reset:${token}`, email, 86400);
    return token;
  }

  async verifyResetToken(token: string): Promise<string | null> {
    return await this.cacheManager.get(`reset:${token}`);
  }

  async deleteResetToken(token: string): Promise<void> {
    await this.cacheManager.del(`reset:${token}`);
  }
}
