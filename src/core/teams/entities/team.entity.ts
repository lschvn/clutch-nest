import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from '../../games/enums/game.enum';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @Column({ unique: true })
  name: string;

  @Column({ default: 1000 })
  elo: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment:
      'Stores game-specific data, e.g., team logo URL, region, external IDs.',
  })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
