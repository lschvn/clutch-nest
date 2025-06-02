import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BetModule } from './bet/bet.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, BetModule, UsersModule],
  exports: [AuthModule, BetModule, UsersModule],
  providers: [],
})
export class CoreModule {}
