import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  venueId!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
