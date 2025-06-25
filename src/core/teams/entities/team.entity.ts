import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game } from '../../games/enums/game.enum';
import { Player } from '../../players/entities/player.entity';

@Entity({ name: 'teams' })
export class Team {
  @ApiProperty({ example: 1, description: 'The unique identifier of the team.' })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ enum: Game, example: Game.VALORANT, description: 'The game the team plays.' })
  @Column({
    type: 'enum',
    enum: Game,
  })
  game: Game;

  @ApiProperty({ example: 'TeamName', description: 'The name of the team.' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ type: () => [Player], description: 'The players in the team.' })
  @OneToMany(() => Player, (player) => player.team)
  players: Player[];

  @ApiProperty({ example: 1200, description: 'The Elo rating of the team.' })
  @Column({ default: 1000 })
  elo: number;

  @ApiProperty({
    example: { logoUrl: 'https://example.com/logo.png', region: 'NA' },
    description: 'Stores game-specific data, e.g., team logo URL, region, external IDs.',
    nullable: true,
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment:
      'Stores game-specific data, e.g., team logo URL, region, external IDs.',
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The date and time the team was created.' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The date and time the team was last updated.' })
  @UpdateDateColumn()
  updatedAt: Date;
}
