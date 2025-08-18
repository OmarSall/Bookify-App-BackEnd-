import {
  IsString, IsNotEmpty, IsEmail, MinLength,
  IsPhoneNumber, IsOptional, ValidateNested, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';
import { CanBeUndefined } from '../../utilities/can-be-undefined';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @CanBeUndefined()
  @Type(() => AddressDto)
  @IsObject()
  @ValidateNested()
  address?: AddressDto;
}
