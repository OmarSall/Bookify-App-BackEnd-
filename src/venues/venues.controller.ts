import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { CreateVenueDto } from './dto/create-venue.dto';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {
  }

  @Get()
  findAll() {
    return this.venues.getList();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.venues.getByIdWithDetails(id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post()
  create(@Body() dto: CreateVenueDto, @Req() req: any) {
    const userId = req.user?.id ?? 1;
    return this.venues.createForHost(dto, userId);
  }
}
