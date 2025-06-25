import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateBetDto {
  @IsNumber()
  @IsNotEmpty()
  matchId: number;

  @IsNumber()
  @IsNotEmpty()
  bettedTeamId: number;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}
