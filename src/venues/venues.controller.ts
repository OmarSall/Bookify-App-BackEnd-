import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, Query } from '@nestjs/common';
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
  findAll(
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const perPageNum = Math.min(60, Math.max(1, parseInt(perPage ?? '12', 10) || 12));

    const min = priceMin !== undefined ? Number(priceMin) : undefined;
    const max = priceMax !== undefined ? Number(priceMax) : undefined;

    return this.venues.getList({
      city,
      page: pageNum,
      perPage: perPageNum,
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
    });
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
