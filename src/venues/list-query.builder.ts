import { Prisma } from '@prisma/client';
import { TYPE_CAPACITY_RULES, VenueType } from './venue.types';

export type ListParams = {
  city?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'price' | 'rating' | 'capacity' | 'createdAt' | 'title';
  sortDir?: 'asc' | 'desc';
  features?: string[];
  type?: VenueType;
  startDate?: string;
  endDate?: string;
  guests?: number;
};

export function buildWhere(params: ListParams): Prisma.VenueWhereInput {
  const {
    city,
    priceMin,
    priceMax,
    features,
    type,
    guests,
  } = params;

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

  let capacityFilter: Prisma.IntFilter | null = null;

  if (guests && guests > 0) {
    capacityFilter = { gte: guests };
  } else if (type && TYPE_CAPACITY_RULES[type]) {
    const rule = TYPE_CAPACITY_RULES[type];
    capacityFilter = {};
    if (rule.gte !== undefined) {
      capacityFilter.gte = rule.gte;
    }
    if (rule.lte !== undefined) {
      capacityFilter.lte = rule.lte;
    }
  }

  if (capacityFilter) andWhere.push({ capacity: capacityFilter });

  return andWhere.length ? { AND: andWhere } : {};
}

export function buildOrderBy(
  sortBy?: 'price' | 'rating' | 'capacity' | 'createdAt' | 'title',
  sortDir?: 'asc' | 'desc',
): Prisma.VenueOrderByWithRelationInput {
  const sortConfig: Record<
    NonNullable<typeof sortBy>,
    { field: keyof Prisma.VenueOrderByWithRelationInput; defaultDir: 'asc' | 'desc' }
  >
    = {
    price: { field: 'pricePerNight', defaultDir: 'asc' },
    rating: { field: 'rating', defaultDir: 'desc' },
    capacity: { field: 'capacity', defaultDir: 'desc' },
    title: { field: 'title', defaultDir: 'asc' },
    createdAt: { field: 'createdAt', defaultDir: 'desc' },
  };

  if (!sortBy) {
    return { createdAt: 'desc' };
  }

  const { field, defaultDir } = sortConfig[sortBy];
  return { [field]: sortDir ?? defaultDir };
}

export function buildOverlapWhere(
  startDate?: string,
  endDate?: string,
): Prisma.BookingWhereInput | undefined {
  const hasRange = !!(startDate && endDate);
  if (!hasRange) {
    return undefined;
  }

  return {
    status: 'CONFIRMED',
    AND: [
      { startDate: { lt: new Date(endDate!) } }, // booking starts before selected end
      { endDate: { gt: new Date(startDate!) } }, // booking ends after selected start
    ],
  };
}

export function buildInclude(
  overlapWhere?: Prisma.BookingWhereInput,
  currentUserId?: number,
): Prisma.VenueInclude {
  return {
    address: { select: { city: true, country: true, street: true, postalCode: true } },
    venueFeatures: { select: { feature: { select: { name: true } } } },
    ...(overlapWhere
      ? {
        bookings: {
          where: overlapWhere,
          select: { id: true, userId: true },
        },
      }
      : {}),
    ...(currentUserId
        ? {
          favourites: {
            where: { userId: currentUserId },
            select: { id: true },
            take: 1,
          },
        }
        : {}
    ),
  };
}
