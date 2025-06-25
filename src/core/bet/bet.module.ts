import { Module } from '@nestjs/common';
import { BetService } from './bet.service';
import { BetController } from './bet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from './entities/bet.entity';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bet]), UsersModule, MatchesModule],
  controllers: [BetController],
  providers: [BetService],
})
export class BetModule {}
