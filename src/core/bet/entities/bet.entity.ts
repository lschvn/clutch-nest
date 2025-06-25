import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity({ name: 'bets' })
export class Bet {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'betted_team_id' })
  bettedTeam: Team;

  @Column({ type: 'int' })
  tokens: number;

  @Column({ type: 'float' })
  odds: number; // Store the odds at which the bet was placed

  /**
   * The potential winnings are calculated as the product of the tokens and the odds.
   * This column is generated using a stored expression in the database.
   * It is nullable because it is not always calculated (e.g. when the bet is not yet placed).
   */
  @Column({
    type: 'float',
    generatedType: 'STORED',
    asExpression: 'tokens * odds',
    nullable: true,
  })
  potentialWinnings: number; // Store the potential winnings

  @Column({
    type: 'enum',
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending',
  })
  status: string; // To track the state of the bet

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
