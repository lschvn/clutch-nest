import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Analytics {
  @ApiProperty({ example: 1, description: 'The unique identifier of the analytics event.' })
  @ApiProperty({ example: 1, description: 'The unique identifier of the analytics event.' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'GET', description: 'The HTTP method of the request.' })
  @Column()
  method: string;

  @ApiProperty({ example: '/users', description: 'The URL of the request.' })
  @Column()
  url: string;

  @ApiProperty({ example: 200, description: 'The HTTP status code of the response.' })
  @Column()
  status: number;

  @ApiProperty({ example: 'https://example.com', description: 'The referrer of the request.', nullable: true })
  @Column({ nullable: true })
  referrer: string;

  @ApiProperty({ example: 150, description: 'The duration of the request in milliseconds.' })
  @Column()
  duration: number;

  @ApiProperty({ description: 'The date and time the analytics event was created.' })
  @CreateDateColumn()
  createdAt: Date;
}
