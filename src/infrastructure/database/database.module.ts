import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Analytics } from 'src/infrastructure/analytics/entities/analytics.entity';
import { User } from 'src/core/users/entities/user.entity';
import { Session } from 'src/core/auth/session/entities/session.entity';
import { Bet } from 'src/core/bet/entities/bet.entity';
import { Match } from 'src/core/matches/entities/match.entity';
import { Team } from 'src/core/teams/entities/team.entity';
import { Tournament } from 'src/core/tournaments/entities/tournament.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5433),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_NAME', 'clutch_dev'),
        entities: [Analytics, User, Session, Bet, Match, Team, Tournament],
        synchronize: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
