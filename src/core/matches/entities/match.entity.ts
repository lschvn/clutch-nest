import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game } from '../../games/enums/game.enum';
import { Team } from '../../teams/entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { MatchStatus } from '../enums/matches.enum';

@Entity({ name: 'matches' })
export class Match {
  @ApiProperty({ example: 1, description: 'The unique identifier of the match.' })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ enum: Game, example: Game.VALORANT, description: 'The game being played in the match.' })
  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @ApiProperty({ example: '2024-07-21T18:00:00Z', description: 'The start time of the match.' })
  @Column({ type: 'timestamp with time zone' })
  startsAt: Date;

  @ApiProperty({
    enum: MatchStatus,
    example: MatchStatus.UPCOMING,
    description: 'The status of the match.',
    default: MatchStatus.UPCOMING,
  })
  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.UPCOMING,
  })
  status: MatchStatus;

  @ApiProperty({ example: 1.5, description: 'The odds for team A to win.', nullable: true })
  @Column({ type: 'float', nullable: true })
  oddsTeamA: number;

  @ApiProperty({ example: 2.5, description: 'The odds for team B to win.', nullable: true })
  @Column({ type: 'float', nullable: true })
  oddsTeamB: number;

  @ApiProperty({ type: () => Team, description: 'Team A participating in the match.' })
  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_a_id' })
  teamA: Team;

  @ApiProperty({ type: () => Team, description: 'Team B participating in the match.' })
  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_b_id' })
  teamB: Team;

  @ApiProperty({ type: () => Team, description: 'The winning team of the match.', nullable: true })
  @ManyToOne(() => Team)
  @JoinColumn({ name: 'winner_team_id' })
  winnerTeam: Team;

  @ApiProperty({ type: () => Tournament, description: 'The tournament the match belongs to.' })
  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ApiProperty({
    example: { matchUrl: 'https://example.com/match/123', streamUrl: 'https://twitch.tv/example', format: 'Bo3' },
    description: 'Stores game-specific data, e.g., match URL, stream URL, format (Bo3, Bo5).',
    nullable: true,
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment:
      'Stores game-specific data, e.g., match URL, stream URL, format (Bo3, Bo5).',
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The date and time the match was created.' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the match was last updated.' })
  @UpdateDateColumn()
  updatedAt: Date;
}
