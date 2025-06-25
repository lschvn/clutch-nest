import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateBetDto {
  @ApiProperty({
    description: 'The ID of the match to bet on.',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  matchId: number;

  @ApiProperty({
    description: 'The ID of the team to bet on.',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  bettedTeamId: number;

  @ApiProperty({
    description: 'The amount of tokens to bet.',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}
