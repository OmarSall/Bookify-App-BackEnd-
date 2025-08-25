import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {
  }

  private nights(firstDate: Date, lastDate: Date) {
    const ms = lastDate.getTime() - firstDate.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  private async ensureNoOverlap(venueId: number, start: Date, end: Date, ignoreId?: number) {
    const overlap = await this.prisma.booking.findFirst({
      where: {
        venueId,
        status: 'CONFIRMED',
        NOT: ignoreId ? { id: ignoreId } : undefined,
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } },
        ],
      },
      select: { id: true },
    });
    if (overlap) {
      throw new BadRequestException('Dates overlap an existing booking');
    }
  }

  async create(userId: number, dto: CreateBookingDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('endDate must be after startDate');

    const venue = await this.prisma.venue.findUnique({ where: { id: dto.venueId }, select: { pricePerNight: true } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    await this.ensureNoOverlap(dto.venueId, start, end);

    const nights = this.nights(start, end);
    const price = Number(venue.pricePerNight);
    const total = (nights * price).toFixed(2);

    return this.prisma.booking.create({
      data: {
        userId,
        venueId: dto.venueId,
        startDate: start,
        endDate: end,
        totalPrice: total,
      },
    });
  }

  async findMine(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { venue: { select: { id: true, title: true, address: { select: { city: true } } } } },
    });
  }

  async updateDates(userId: number, id: number, dto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException();
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException();
    }
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    await this.ensureNoOverlap(booking.venueId, start, end, id);

    const oldNights = this.nights(booking.startDate, booking.endDate);
    if (oldNights <= 0) {
      throw new BadRequestException('Corrupted booking dates');
    }
    const lockedPricePerNight = Number(booking.totalPrice) / oldNights;
    const newNights = this.nights(start, end);
    const total = Math.round((lockedPricePerNight * newNights));

    return this.prisma.booking.update({
      where: { id },
      data: { startDate: start, endDate: end, totalPrice: total },
    });
  }

  async cancel(userId: number, id: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException();
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
