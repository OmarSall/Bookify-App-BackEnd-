import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import slugify from 'slugify';
import { CreateVenueDto } from './dto/create-venue.dto';
import { Prisma } from '@prisma/client';

type VenueType = 'studio' | 'apartment' | 'house' | 'villa';

const TYPE_CAPACITY_RULES: Record<VenueType, { gte?: number; lte?: number }> = {
  studio:     { lte: 2 },
  apartment:  { lte: 3 },
  house:      { gte: 4, lte: 8 },
  villa:      { gte: 9 },
};

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {
  }

  private toCardDto(venue: any) {
    const price =
      typeof venue.pricePerNight === 'string'
        ? Number(venue.pricePerNight)
        : Number(venue.pricePerNight);

    const featureNames: string[] =
      venue.venueFeatures?.map((venueFeature: any) => venueFeature.feature.name).filter(Boolean) ?? [];

    return {
      id: venue.id,
      title: venue.title,
      name: venue.title,
      address: venue.address ? { city: venue.address.city } : null,
      location: {
        name: venue.address?.city ?? null,
        postalCode: venue.address?.postalCode ?? null,
      },
      pricePerNight: price,
      rating: venue.rating ?? null,
      capacity: venue.capacity,
      albumId: venue.albumId ?? null,
      features: featureNames,
      isFavourite: venue.isFavourite ?? false,
    };
  }

  private toDetailsDto(venue: any) {
    const card = this.toCardDto(venue);
    return {
      ...card,
      venueId: venue.id,
      numberOfReviews: venue.details?.numberOfReviews ?? 0,
      description: venue.description,
      sleepingDetails: {
        maxCapacity: venue.details?.sleepingMaxCapacity ?? null,
        amountOfBeds: venue.details?.sleepingBeds ?? null,
      },
      checkInHour: venue.details?.checkInHour ?? null,
      checkOutHour: venue.details?.checkOutHour ?? null,
      distanceFromCityCenterInKM: venue.details?.distanceFromCityCenterInKM ?? null,
      contactDetails: {
        phone: venue.details?.contactPhone ?? null,
        email: venue.details?.contactEmail ?? null,
      },
    };
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
  }) {
    const { city, page, perPage, priceMin, priceMax, sortBy, sortDir, features, type } = params;

    const andWhere: Prisma.VenueWhereInput[] = [];

    const trimmedCity = city?.trim();
    if (trimmedCity) {
      andWhere.push({
        address: {
          is: {
            city: { contains: trimmedCity, mode: Prisma.QueryMode.insensitive },
          },
        },
      });
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (priceMin !== undefined) {
        priceFilter.gte = priceMin;
      }
      if (priceMax !== undefined) {
        priceFilter.lte = priceMax;
      }
      andWhere.push({ pricePerNight: priceFilter });
    }

    if (features && features.length) {
      for (const name of features) {
        andWhere.push({
          venueFeatures: {
            some: {
              feature: {
                name: { equals: name, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
        });
      }
    }

    if (type && TYPE_CAPACITY_RULES[type]) {
      const rule = TYPE_CAPACITY_RULES[type];
      const capacityFilter: Prisma.IntFilter = {};
      if (rule.gte !== undefined) {
        capacityFilter.gte = rule.gte;
      }
      if (rule.lte !== undefined) {
        capacityFilter.lte = rule.lte;
      }
      andWhere.push({ capacity: capacityFilter });
    }

    const where: Prisma.VenueWhereInput = andWhere.length ? { AND: andWhere } : {};

    const orderBy: Prisma.VenueOrderByWithRelationInput =
      sortBy === 'price' ? { pricePerNight: sortDir ?? 'asc' } :
        sortBy === 'rating' ? { rating: sortDir ?? 'desc' } :
          sortBy === 'capacity' ? { capacity: sortDir ?? 'desc' } :
            sortBy === 'title' ? { title: sortDir ?? 'asc' } :
              sortBy === 'createdAt' ? { createdAt: sortDir ?? 'desc' } :
                { createdAt: 'desc' };

    const [totalCount, rows] = await this.prisma.$transaction([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        include: {
          address: { select: { city: true, country: true, street: true, postalCode: true } },
          venueFeatures: { select: { feature: { select: { name: true } } } },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items = rows.map((v) => this.toCardDto(v));
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
    return this.toDetailsDto(row);
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

    return this.toCardDto(created);
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
}
