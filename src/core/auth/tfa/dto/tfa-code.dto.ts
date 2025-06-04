import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TfaCodeDto {
  @ApiProperty({
    description: 'The 6-digit code from the authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters long' })
  twoFactorAuthenticationCode: string;
}
