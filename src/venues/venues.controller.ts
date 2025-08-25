import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, Res, UseGuards, Query } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { CreateVenueDto } from './dto/create-venue.dto';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {
  }

  @Get('locations')
  getLocations() {
    return this.venues.getAllLocations();
  }

  @Get()
  findAll(@Query('city') city?: string) {
    return this.venues.getList({ city });
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
