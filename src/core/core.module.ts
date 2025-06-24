import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BetModule } from './bet/bet.module';
import { UsersModule } from './users/users.module';
import { OddsModule } from './odds/odds.module';
import { EloModule } from './elo/elo.module';
import { GamesModule } from './games/games.module';
import { MatchesModule } from './matches/matches.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [
    AuthModule,
    BetModule,
    UsersModule,
    OddsModule,
    EloModule,
    GamesModule,
    MatchesModule,
    TeamsModule,
    TournamentsModule,
  ],
  exports: [AuthModule, BetModule, UsersModule],
  providers: [],
})
export class CoreModule {}
