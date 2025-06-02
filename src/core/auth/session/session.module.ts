import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Session } from './entities/session.entity';
import { User } from '../../users/entities/user.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
// Assuming jwtConstants.secret is available, otherwise use a placeholder or ConfigService
// For simplicity, using a placeholder value. In a real app, this should be from config.
// const jwtConstants = { secret: 'yourSecretKey' }; // Example, replace with actual config

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, User]),
    JwtModule.register({
      // secret: jwtConstants.secret, // Example: if AuthGuard needs to verify JWTs
      // signOptions: { expiresIn: '60s' }, // Example: if AuthGuard needs to verify JWTs
      // If SessionService itself doesn't use JwtService for *generating* its session tokens,
      // and AuthGuard's JwtService is configured/provided globally or by AuthModule,
      // this registration might be simplified or even removed if AuthGuard has its own setup.
      // For now, providing a basic registration as AuthGuard is a dependency.
    }),
  ],
  providers: [SessionService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
