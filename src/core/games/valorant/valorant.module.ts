import { Module } from '@nestjs/common';
import { ValorantService } from './valorant.service';
import { VlrService } from './vlr/vlr.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from 'src/core/matches/entities/match.entity';
import { Team } from 'src/core/teams/entities/team.entity';
import { Tournament } from 'src/core/tournaments/entities/tournament.entity';
import { Player } from 'src/core/players/entities/player.entity';
import { EloModule } from 'src/core/elo/elo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Team, Tournament, Player]),
    EloModule,
  ],
  providers: [ValorantService, VlrService],
  exports: [ValorantService],
})
export class ValorantModule {}
