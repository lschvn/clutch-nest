import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  exports: [TypeOrmModule, MatchesService],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
