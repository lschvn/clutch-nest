import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // import UsersModule so UsersService is available
import { CacheModule } from '@nestjs/cache-manager'; // import CacheModule for CACHE_MANAGER
import { ConfigModule } from '@nestjs/config';
import { SessionModule } from './session/session.module'; // Provide SessionService
import { TfaModule } from './tfa/tfa.module'; // Provide TfaService
import { AuthGuard } from './auth.guard';

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
    TfaModule, // So AuthService can inject TfaService & handlers
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, SessionModule, AuthGuard],
})
export class AuthModule {}
