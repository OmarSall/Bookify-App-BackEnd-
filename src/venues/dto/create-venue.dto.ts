import { IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  pricePerNight!: number;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsInt()
  albumId?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  // address
  @IsString() street!: string;
  @IsString() city!: string;
  @IsString() country!: string; // 'PL'
  @IsOptional() @IsString() postalCode?: string;

  // features (nazwy)
  @IsArray()
  @IsString({ each: true })
  features!: string[];
}
