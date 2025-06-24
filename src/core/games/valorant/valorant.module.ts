import { Module } from '@nestjs/common';
import { ValorantService } from './valorant.service';
import { VlrService } from './vlr/vlr.service';

@Module({
  imports: [],
  providers: [ValorantService, VlrService],
  exports: [ValorantService],
})
export class ValorantModule {}
