import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { FavouritesService } from './favourites.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';

@UseGuards(JwtAuthenticationGuard)
@Controller('favourites')
export class FavouritesController {
  constructor(private readonly service: FavouritesService) {
  }

  @Get('me') mine(@Req() req: any) {
    return this.service.listMine(req.user.id);
  }

  @Get('me/ids')
  myIds(
    @Req() req: any) {
    return this.service.listMyVenueIds(req.user.id);
  }

  @Post(':venueId')
  add(
    @Param('venueId', ParseIntPipe) venueId: number,
    @Req() req: any) {
    return this.service.add(req.user.id, venueId);
  }

  @Delete(':venueId')
  remove(
    @Param('venueId', ParseIntPipe) venueId: number,
    @Req() req: any) {
    return this.service.remove(req.user.id, venueId);
  }
}
