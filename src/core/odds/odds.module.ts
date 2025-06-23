import { Module } from '@nestjs/common';
import { OddsService } from './odds.service';

@Module({
  providers: [OddsService]
})
export class OddsModule {}
