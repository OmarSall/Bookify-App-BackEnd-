import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';

@UseGuards(JwtAuthenticationGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get('me') my(@Req() req: any) {
    return this.service.findMine(req.user.id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingDto, @Req() req: any) {
    return this.service.updateDates(req.user.id, id, dto);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cancel(req.user.id, id);
  }
}
