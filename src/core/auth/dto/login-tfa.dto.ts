import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, Length, Min } from 'class-validator';

export class LoginTfaDto {
  @ApiProperty({
    description: 'The ID of the user attempting to log in.',
    example: 1,
  })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'The 6-digit code from the authenticator app.',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, {
    message:
      'Two-factor authentication code must be exactly 6 characters long.',
  })
  twoFactorAuthenticationCode: string;
}
