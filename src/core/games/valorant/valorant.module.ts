import { Module } from '@nestjs/common';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';

@Module({
  imports: [TeamsModule, PlayersModule, MatchesModule]
})
export class ValorantModule {}
