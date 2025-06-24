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
import { Tournament } from '../../tournaments/entities/tournament.entity';

@Entity({ name: 'matches' })
export class Match {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @Column({ type: 'timestamp with time zone' })
  startsAt: Date;

  @Column({ type: 'float', nullable: true })
  oddsTeamA: number;

  @Column({ type: 'float', nullable: true })
  oddsTeamB: number;

  @Column({ nullable: true })
  teamAId: number;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_a_id' })
  teamA: Team;

  @Column({ nullable: true })
  teamBId: number;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_b_id' })
  teamB: Team;

  @Column({ nullable: true })
  winnerTeamId: number;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'winner_team_id' })
  winnerTeam: Team;

  @Column({ nullable: true })
  tournamentId: number;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment:
      'Stores game-specific data, e.g., match URL, stream URL, format (Bo3, Bo5).',
  })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
