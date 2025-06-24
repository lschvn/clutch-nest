import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ 'name': 'val_match' })
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  team_a: string

  @Column()
  team_b: string
}
