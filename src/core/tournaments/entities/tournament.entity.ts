import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from '../../games/enums/game.enum';

@Entity({ name: 'tournaments' })
export class Tournament {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @Column()
  name: string;

  @Column({
    type: 'float',
    default: 1,
    comment:
      'Importance coefficient for ELO calculation (e.g., 1.5 for a major tournament).',
  })
  coefficient: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: 'Stores game-specific data, e.g., prize pool, location.',
  })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
