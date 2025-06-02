import { Module } from '@nestjs/common';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { CoreModule } from './core/core.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get('THROTTLE_TTL', 60) * 1000,
        limit: configService.get('THROTTLE_LIMIT', 100),
      }]),
    }),
    ConfigModule.forRoot(),
    CacheModule.register(),
    EventEmitterModule.forRoot(),
    CoreModule,
    InfrastructureModule,
  ],
  controllers: [],
  providers: [
      {
        provide: APP_INTERCEPTOR,
        useClass: CacheInterceptor,
      },
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ],
})
export class AppModule {}
