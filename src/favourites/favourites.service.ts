import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FavouritesService {
  constructor(private readonly prisma: PrismaService) {
  }

  listMine(userId: number) {
    return this.prisma.favourite.findMany({
      where: { userId },
      include: {
        venue: {
          select: {
            id: true,
            title: true,
            address: {
              select: {
                city: true,
              },
            },
            albumId: true,
            rating: true,
            capacity: true,
            pricePerNight: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMyVenueIds(userId: number): Promise<number[]> {
    const rows = await this.prisma.favourite.findMany({
      where: { userId },
      select: { venueId: true },
    });
    return rows.map((row) => row.venueId);
  }

  async add(userId: number, venueId: number) {
    await this.prisma.favourite.upsert({
      where: { userId_venueId: { userId, venueId } },
      update: {},
      create: { userId, venueId },
    });
    return { ok: true };
  }

  remove(userId: number, venueId: number) {
    return this.prisma.favourite.delete({ where: { userId_venueId: { userId, venueId } } });
  }
}
