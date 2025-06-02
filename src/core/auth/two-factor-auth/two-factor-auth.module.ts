import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../../users/users.module';
import { SessionModule } from '../session/session.module'; // Added
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorEmailListenerService } from './two-factor-email-listener.service'; // Added

@Module({
  imports: [
    ConfigModule, // For ConfigService used in TwoFactorAuthService and potentially Controller
    CacheModule.register(), // For CACHE_MANAGER used in TwoFactorAuthController
    UsersModule, // To provide UsersService for TwoFactorAuthService and Controller
    SessionModule, // Added
    // EventEmitterModule is assumed to be globally registered (e.g. in AppModule)
  ],
  providers: [TwoFactorAuthService, TwoFactorEmailListenerService], // Added TwoFactorEmailListenerService
  controllers: [TwoFactorAuthController],
  // TwoFactorAuthService is not exported as per current requirements
  // exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}
