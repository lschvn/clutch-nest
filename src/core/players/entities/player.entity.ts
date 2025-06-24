import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from '../../games/enums/game.enum';
import { Team } from '../../teams/entities/team.entity';

@Entity({ name: 'players' })
export class Player {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @ManyToOne(() => Team, { cascade: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: 'Stores game-specific data, e.g., real name, country, role.',
  })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
