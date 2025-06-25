import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game } from '../../games/enums/game.enum';

@Entity({ name: 'tournaments' })
export class Tournament {
  @ApiProperty({ example: 1, description: 'The unique identifier of the tournament.' })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ enum: Game, example: Game.VALORANT, description: 'The game of the tournament.' })
  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @ApiProperty({ example: 'Valorant Champions Tour', description: 'The name of the tournament.' })
  @Column()
  name: string;

  @ApiProperty({
    example: 1.5,
    description: 'Importance coefficient for ELO calculation (e.g., 1.5 for a major tournament).',
    default: 1,
  })
  @Column({
    type: 'float',
    default: 1,
    comment:
      'Importance coefficient for ELO calculation (e.g., 1.5 for a major tournament).',
  })
  coefficient: number;

  @ApiProperty({
    example: { prizePool: '$1,000,000', location: 'Los Angeles' },
    description: 'Stores game-specific data, e.g., prize pool, location.',
    nullable: true,
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: 'Stores game-specific data, e.g., prize pool, location.',
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The date and time the tournament was created.' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the tournament was last updated.' })
  @UpdateDateColumn()
  updatedAt: Date;
}
