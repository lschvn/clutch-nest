import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Analytics } from 'src/infrastructure/analytics/entities/analytics.entity';
import { User } from 'src/core/users/entities/user.entity';
import { Session } from 'src/core/auth/session/entities/session.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'clutch'),
        password: configService.get('DATABASE_PASSWORD', 'clutch'),
        database: configService.get('DATABASE_NAME', 'clutch'),
        entities: [Analytics, User, Session],
        synchronize: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
