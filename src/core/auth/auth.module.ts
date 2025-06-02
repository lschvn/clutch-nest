import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // import UsersModule so UsersService is available
import { CacheModule } from '@nestjs/cache-manager'; // import CacheModule for CACHE_MANAGER
import { ConfigModule } from '@nestjs/config';
import { SessionModule } from './session/session.module'; // Provide SessionService
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module'; // Provide TwoFactorAuthService

@Module({
  imports: [
    ConfigModule, // Make ConfigService available
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20d' },
    }),
    UsersModule,
    CacheModule.register(),
    SessionModule, // So AuthService can inject SessionService
    TwoFactorAuthModule, // So AuthService can inject TwoFactorAuthService & handlers
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
