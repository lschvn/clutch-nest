import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // import UsersModule so UsersService is available
import { CacheModule } from '@nestjs/cache-manager'; // import CacheModule for CACHE_MANAGER
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // Make ConfigService available
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20d' },
    }),
    UsersModule,
    CacheModule.register(), 
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
