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

@Entity({ name: 'players' })
export class Player {
  @ApiProperty({ example: 1, description: 'The unique identifier of the player.' })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ example: 'PlayerName', description: 'The name of the player.' })
  @Column()
  name: string;

  @ApiProperty({ enum: Game, example: Game.VALORANT, description: 'The game the player plays.' })
  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @ApiProperty({ type: () => Team, description: 'The team the player belongs to.' })
  @ManyToOne(() => Team, { cascade: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ApiProperty({
    example: { realName: 'John Doe', country: 'USA', role: 'Duelist' },
    description: 'Stores game-specific data, e.g., real name, country, role.',
    nullable: true,
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: 'Stores game-specific data, e.g., real name, country, role.',
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The date and time the player was created.' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the player was last updated.' })
  @UpdateDateColumn()
  updatedAt: Date;
}
