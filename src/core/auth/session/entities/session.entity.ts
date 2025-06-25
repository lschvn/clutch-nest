import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../users/entities/user.entity';

@Entity()
export class Session {
  @ApiProperty({ example: 1, description: 'The unique identifier of the session.' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => User, description: 'The user associated with the session.' })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'jwt.token.string', description: 'The session token.' })
  @Index({ unique: true })
  @Column()
  token: string;

  @ApiProperty({ example: '192.168.1.1', description: 'The IP address used for the session.', nullable: true })
  @Column({ nullable: true })
  ipAddress?: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    description: 'The user agent used for the session.',
    nullable: true,
  })
  @Column({ nullable: true })
  userAgent?: string;

  @ApiProperty({ example: '2024-07-21T18:00:00Z', description: 'The last time the session was used.' })
  @Column()
  lastUsedAt: Date;

  @ApiProperty({ example: '2024-07-22T18:00:00Z', description: 'The expiration date of the session.' })
  @Column()
  expiresAt: Date;
}
