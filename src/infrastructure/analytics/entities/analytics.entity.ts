import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Analytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column()
  status: number;

  @Column({ nullable: true })
  referrer: string;

  @Column()
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
