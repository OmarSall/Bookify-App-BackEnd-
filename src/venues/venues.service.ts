import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import slugify from 'slugify';
import { CreateVenueDto } from './dto/create-venue.dto';
import { toCardDto, toDetailsDto } from "./venue.mappers";
import { AvailabilityStatus, VenueType } from "./venue.types";
import { buildWhere, buildOrderBy, buildOverlapWhere, buildInclude } from "./list-query.builder";
import { computeAvailabilityStatus } from "./availability.util";

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {
  }

  async getList(params: {
    city?: string;
    page: number;
    perPage: number;
    priceMin?: number;
    priceMax?: number;
    sortBy?: 'price' | 'rating' | 'capacity' | 'createdAt' | 'title';
    sortDir?: 'asc' | 'desc';
    features?: string[];
    type?: VenueType;
    startDate?: string;
    endDate?: string;
    currentUserId?: number;
    guests?: number;
  }) {
    const {
      page,
      perPage,
      startDate,
      endDate,
      currentUserId,
      ...filters
    } = params;

    const where = buildWhere(filters);
    const orderBy = buildOrderBy(filters.sortBy, filters.sortDir);
    const overlapWhere = buildOverlapWhere(startDate, endDate);
    const include = buildInclude(overlapWhere, currentUserId);
    const hasRange = !!(startDate && endDate)

    const [totalCount, rows] = await this.prisma.$transaction([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items = rows.map((v: any) => {
      const base = toCardDto(v);
      const availabilityStatus: AvailabilityStatus = computeAvailabilityStatus(
        hasRange,
        (v as any)?.bookings as Array<{ userId: number }> | undefined,
        currentUserId
      );

      return { ...base, availabilityStatus };
    });

    return { items, totalCount };
  }

  async getByIdWithDetails(id: number) {
    const row = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        address: true,
        venueFeatures: { select: { feature: { select: { name: true } } } },
        details: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Venue not found');
    }
    return toDetailsDto(row);
  }

  async createForHost(dto: CreateVenueDto, hostId: number) {
    const featureIds: number[] = [];
    for (const name of dto.features ?? []) {
      const feature = await this.prisma.feature.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      featureIds.push(feature.id);
    }

    const created = await this.prisma.venue.create({
      data: {
        title: dto.title,
        slug: slugify(`${dto.title}-${Date.now()}`, { lower: true }),
        description: dto.description,
        pricePerNight: dto.pricePerNight,
        capacity: dto.capacity,
        albumId: dto.albumId ?? null,
        rating: dto.rating ?? null,
        host: {
          connect:
            { id: hostId },
        },
        address: {
          create: {
            street: dto.street,
            city: dto.city,
            country: dto.country,
            postalCode: dto.postalCode ?? null,
          },
        },
        venueFeatures: {
          create: featureIds.map((id) => ({
            feature: { connect: { id } },
          })),
        },
      },
      include: {
        address: true,
        venueFeatures: {
          select: {
            feature: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return toCardDto(created);
  }

  async getAllLocations(): Promise<string[]> {
    const venues = await this.prisma.venue.findMany({
      select: { address: { select: { city: true } } },
    });

    const unique = new Set(
      venues
        .map(v => (v.address?.city ?? '').trim())
        .filter(Boolean),
    );

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }

  async getPriceRange() {
    const agg = await this.prisma.venue.aggregate({
      _min: { pricePerNight: true },
      _max: { pricePerNight: true },
    });

    return {
      minPrice: Number(agg._min.pricePerNight ?? 0),
      maxPrice: Number(agg._max.pricePerNight ?? 0),
    };
  }
}
