import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import slugify from 'slugify';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {
  }

  private toCardDto(v: any) {
    const price =
      typeof v.pricePerNight === 'string'
        ? Number(v.pricePerNight)
        : Number(v.pricePerNight);

    const featureNames: string[] =
      v.venueFeatures?.map((vf: any) => vf.feature.name) ?? [];

    return {
      id: v.id,
      name: v.title,
      location: {
        name: v.address?.city ?? null,
        postalCode: v.address?.postalCode ?? null,
      },
      pricePerNightInEUR: price,
      rating: v.rating ?? null,
      capacity: v.capacity,
      albumId: v.albumId ?? null,
      features: featureNames,
    };
  }

  private toDetailsDto(v: any) {
    const card = this.toCardDto(v);
    return {
      ...card,
      venueId: v.id,
      numberOfReviews: v.details?.numberOfReviews ?? 0,
      description: v.description,
      sleepingDetails: {
        maxCapacity: v.details?.sleepingMaxCapacity ?? null,
        amountOfBeds: v.details?.sleepingBeds ?? null,
      },
      checkInHour: v.details?.checkInHour ?? null,
      checkOutHour: v.details?.checkOutHour ?? null,
      distanceFromCityCenterInKM: v.details?.distanceFromCityCenterInKM ?? null,
      contactDetails: {
        phone: v.details?.contactPhone ?? null,
        email: v.details?.contactEmail ?? null,
      },
    };
  }

  async getList(params?: { city?: string }) {
    const city = params?.city?.trim();

    const rows = await this.prisma.venue.findMany({
      where: city
        ? { address: { is: { city: { contains: city, mode: 'insensitive' } } } }
        : undefined,
      include: {
        address: { select: { city: true, country: true, street: true, postalCode: true } },
        // ↓ jeśli masz tabelę łączącą venueFeatures -> feature(name)
        venueFeatures: { select: { feature: { select: { name: true } } } },
        // ↑ a jeśli masz bezpośrednio: features: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // spłaszcz features do string[]
    return rows.map((v) => ({
      ...v,
      features: Array.isArray(v.venueFeatures)
        ? v.venueFeatures.map((vf) => vf.feature.name)
        : Array.isArray((v as any).features)
          ? (v as any).features.map((f: any) => f.name)
          : [],
    }));
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
        pricePerNight: dto.pricePerNight.toFixed(2),
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
        .map(v => (v.address?.city ?? "").trim())
        .filter(Boolean)
    );

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }
}
