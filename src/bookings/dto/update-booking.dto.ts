import { IsDateString } from 'class-validator';

export class UpdateBookingDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
