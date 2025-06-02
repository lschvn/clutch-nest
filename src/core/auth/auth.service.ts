import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async signIn(email: string, password: string) {
    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await this.usersService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }

  async signUp(name: string, email: string, password: string) {
    const user = await this.usersService.create({
      name,
      email,
      password: await this.usersService.hashPassword(password),
    });
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
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