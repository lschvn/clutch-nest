import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Register User repository
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export UsersService for other modules
})
export class UsersModule {}
