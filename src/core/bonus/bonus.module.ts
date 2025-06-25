import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DailyBonusInterceptor } from './bonus.interceptor';

@Module({
  imports: [UsersModule],
  providers: [DailyBonusInterceptor],
  exports: [DailyBonusInterceptor],
})
export class BonusModule {}
