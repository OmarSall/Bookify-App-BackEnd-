import { Module } from '@nestjs/common';
import { FavouritesController } from './favourites.controller';
import { FavouritesService } from './favourites.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [FavouritesController],
  providers: [FavouritesService, PrismaService],
})
export class FavouritesModule {}
