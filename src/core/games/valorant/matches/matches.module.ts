import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchesService } from './matches.service';

@Module({
      imports: [TypeOrmModule.forFeature([Match])],
      providers: [MatchesService],
})
export class MatchesModule {}
