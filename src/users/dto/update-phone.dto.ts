import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class UpdatePhoneDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber!: string;
}