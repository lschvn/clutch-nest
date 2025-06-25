import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// TODO: Add a column and the logic to store the user's balance
// TODO: Add a column and the logic to store the user's avatar
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: 'user', type: 'enum', enum: ['user', 'admin'] })
  role: string;

  @Column({ default: false })
  isTwoFactorAuthenticationEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  twoFactorAuthenticationSecret: string | null;

  @Column({ default: new Date() })
  created_at: Date;

  @Column({ default: new Date() })
  updated_at: Date;
}
