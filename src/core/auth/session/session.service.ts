import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Session } from './entities/session.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService, // Though not used in the provided snippet, it's requested.
  ) {}

  async createSession(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Session expires in 7 days
    const lastUsedAt = new Date();

    const session = this.sessionRepository.create({
      user,
      token,
      ipAddress,
      userAgent,
      lastUsedAt,
      expiresAt,
    });

    await this.sessionRepository.save(session);
    return token;
  }

  async validateSession(token: string): Promise<User | null> {
    const session = await this.sessionRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.remove(session);
      return null;
    }

    session.lastUsedAt = new Date();
    await this.sessionRepository.save(session);
    return session.user;
  }

  async invalidateSession(token: string): Promise<void> {
    const session = await this.sessionRepository.findOneBy({ token });
    if (session) {
      await this.sessionRepository.remove(session);
    }
  }

  async invalidateAllUserSessions(
    userId: number,
    currentSessionTokenToKeep?: string,
  ): Promise<void> {
    const whereClause: any = { user: { id: userId } };
    if (currentSessionTokenToKeep) {
      whereClause.token = Not(currentSessionTokenToKeep);
    }
    const sessions = await this.sessionRepository.find({ where: whereClause });
    if (sessions.length > 0) {
      await this.sessionRepository.remove(sessions);
    }
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        user: { id: userId },
        expiresAt: MoreThan(new Date()), // Only active sessions
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });
  }

  async findSessionById(id: number): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { id },
      relations: ['user'], // Include user to check ownership
    });
  }
}
