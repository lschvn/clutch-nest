import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

// TODO: Add a column and the logic to store the user's balance
// TODO: Add a column and the logic to store the user's avatar
@Entity()
export class User {
  @ApiProperty({ example: 1, description: 'The unique identifier of the user.' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'user@example.com', description: 'The email address of the user.' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'The name of the user.' })
  @Column()
  name: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ example: true, description: 'Indicates if the user email is verified.', default: false })
  @Column({ default: false })
  verified: boolean;

  @ApiProperty({
    example: 'user',
    description: 'The role of the user.',
    enum: ['user', 'admin'],
    default: 'user',
  })
  @Column({ default: 'user', type: 'enum', enum: ['user', 'admin'] })
  role: string;

  @ApiProperty({ example: false, description: 'Indicates if two-factor authentication is enabled.', default: false })
  @Column({ default: false })
  isTwoFactorAuthenticationEnabled: boolean;

  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXP',
    description: 'The secret for two-factor authentication.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  twoFactorAuthenticationSecret: string | null;

  // TODO: every 24 hours, the balance should add 100 if the user come to the app
  @ApiProperty({ example: 1000, description: 'The current balance of the user.', default: 1000 })
  @Column({ default: 1000 })
  balance: number;

  @ApiProperty({
    example: '2024-07-21T18:00:00Z',
    description: 'The last time the user connected.',
    nullable: true,
    default: null,
  })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    default: null,
  })
  lastConnection: Date | null;

  @ApiProperty({ description: 'The date and time the user was created.' })
  @Column({ default: new Date() })
  created_at: Date;

  @ApiProperty({ description: 'The date and time the user was last updated.' })
  @Column({ default: new Date() })
  updated_at: Date;
}
