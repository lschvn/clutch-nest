import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../../users/users.module';
import { SessionModule } from '../session/session.module'; // Added
import { TfaService } from './tfa.service';
import { TfaController } from './tfa.controller';
import { TfaEmailListenerService } from './tfa-email-listener.service'; // Added

@Module({
  imports: [
    ConfigModule, // For ConfigService used in TfaService and potentially Controller
    CacheModule.register(), // For CACHE_MANAGER used in TfaController
    UsersModule, // To provide UsersService for TfaService and Controller
    SessionModule, // Added
    // EventEmitterModule is assumed to be globally registered (e.g. in AppModule)
  ],
  providers: [TfaService, TfaEmailListenerService], // Added TfaEmailListenerService
  controllers: [TfaController],
  exports: [TfaService], // Export TfaService so AuthModule can use it
})
export class TfaModule {}
