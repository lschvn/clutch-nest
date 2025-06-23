import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BetModule } from './bet/bet.module';
import { UsersModule } from './users/users.module';
import { OddsModule } from './odds/odds.module';

@Module({
  imports: [AuthModule, BetModule, UsersModule, OddsModule],
  exports: [AuthModule, BetModule, UsersModule],
  providers: [],
})
export class CoreModule {}
