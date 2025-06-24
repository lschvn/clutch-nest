import { Module } from '@nestjs/common';
import { ValorantModule } from './valorant/valorant.module';

@Module({
  imports: [ValorantModule]
})
export class GamesModule {}
