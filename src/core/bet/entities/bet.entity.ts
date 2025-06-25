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
import { Match } from '../../matches/entities/match.entity';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity({ name: 'bets' })
export class Bet {
  @ApiProperty({ example: 1, description: 'The unique identifier of the bet.' })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ type: () => User, description: 'The user who placed the bet.' })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Match, description: 'The match the bet is placed on.' })
  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  /**
   * The team that the user has bet on.
   */
  @ApiProperty({ type: () => Team, description: 'The team the user has bet on.' })
  @ManyToOne(() => Team)
  @JoinColumn({ name: 'betted_team_id' })
  bettedTeam: Team;

  /**
   * The number of tokens that the user has bet on the match.
   */
  @ApiProperty({ example: 100, description: 'The amount of tokens bet on the match.' })
  @Column({ type: 'int' })
  amount: number;

  @ApiProperty({ example: 1.85, description: 'The odds at which the bet was placed.' })
  @Column({ type: 'float' })
  odds: number; // Store the odds at which the bet was placed

  /**
   * The potential winnings are calculated as the product of the tokens and the odds.
   * This column is generated using a stored expression in the database.
   * It is nullable because it is not always calculated (e.g. when the bet is not yet placed).
   */
  @ApiProperty({
    example: 185,
    description: 'The potential winnings from the bet (amount * odds).',
    nullable: true,
  })
  @Column({
    type: 'float',
    generatedType: 'STORED',
    asExpression: 'tokens * odds',
    nullable: true,
  })
  potentialWinnings: number; // Store the potential winnings

  @ApiProperty({
    example: 'pending',
    description: 'The status of the bet.',
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending',
  })
  @Column({
    type: 'enum',
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending',
  })
  status: string; // To track the state of the bet

  @ApiProperty({ description: 'The date and time the bet was created.' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the bet was last updated.' })
  @UpdateDateColumn()
  updatedAt: Date;
}
