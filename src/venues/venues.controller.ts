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
    @Query('sortBy') sortBy?: 'price' | 'rating' | 'capacity' | 'createdAt' | 'title',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('features') featuresRaw?: string | string[],
    @Query('features[]') featuresBracket?: string[] | string,
    @Query('type') type?: 'studio' | 'apartment' | 'house' | 'villa',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const perPageNum = Math.min(60, Math.max(1, parseInt(perPage ?? '12', 10) || 12));

    const min = priceMin !== undefined ? Number(priceMin) : undefined;
    const max = priceMax !== undefined ? Number(priceMax) : undefined;

    const toArray = (x?: string | string[]) =>
      Array.isArray(x) ? x : (typeof x === 'string' ? x.split(',') : []);

    const featureList = [
      ...toArray(featuresRaw),
      ...toArray(featuresBracket),
    ]
      .map(s => s.trim())
      .filter(Boolean);

    const features = featureList.length ? featureList : undefined;

    return this.venues.getList({
      city,
      page: pageNum,
      perPage: perPageNum,
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
      sortBy,
      sortDir,
      features,
      type,
      startDate,
      endDate,
      currentUserId: req?.user?.id,
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
