import { Module } from '@nestjs/common';
import { OddsService } from './odds.service';
import { EloModule } from '../elo/elo.module';

@Module({
  providers: [OddsService],
  imports: [EloModule],
})
export class OddsModule {}
