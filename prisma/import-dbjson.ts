import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

type VenueRow = {
  id: number;
  location: { postalCode: string; name: string };
  pricePerNightInEUR: number;
  rating: number;
  capacity: number;
  name: string;
  albumId: number;
  features: string[];
};

type VenueDetailsRow = VenueRow & {
  venueId: number;
  numberOfReviews: number;
  description: string;
  features: string[];
  sleepingDetails: { maxCapacity: number; amountOfBeds: number };
  checkInHour: string;
  checkOutHour: string;
  distanceFromCityCenterInKM: number;
  contactDetails: { phone: string; email: string };
};

type DbDump = { venues: VenueRow[]; venuesDetails: VenueDetailsRow[] };

const DB_PATH = 'prisma/db.json';
const HOLDING_HOST_EMAIL = process.env.HOLDING_HOST_EMAIL ?? 'holding@bookify.local';
const HOLDING_HOST_NAME = 'System Host';

async function ensureHoldingHostId() {
  const user = await prisma.user.upsert({
    where: { email: HOLDING_HOST_EMAIL },
    update: {},
    create: {
      email: HOLDING_HOST_EMAIL,
      name: HOLDING_HOST_NAME,
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      // OPTIONAL fields:
      // role: 'ADMIN', // or 'SYSTEM'
      // isActive: false,
    },
    select: { id: true },
  });
  return user.id;
}

function slugify(title: string, id: number) {
  return `${title}-${id}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function upsertFeature(name: string) {
  return prisma.feature.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function buildFeatureMap(featureNames: string[]) {
  const map = new Map<string, number>();
  for (const name of featureNames) {
    const feature = await upsertFeature(name);
    map.set(feature.name, feature.id);
  }
  return map;
}

async function ensureVenue(venue: VenueRow, hostId: number) {
  await prisma.venue.upsert({
    where: { id: venue.id },
    update: {
      title: venue.name,
      slug: slugify(venue.name, venue.id),
      description: 'Auto-imported',
      pricePerNight: venue.pricePerNightInEUR.toFixed(2),
      capacity: venue.capacity,
      albumId: venue.albumId,
      rating: venue.rating,
      hostId,
    },
    create: {
      id: venue.id,
      title: venue.name,
      slug: slugify(venue.name, venue.id),
      description: 'Auto-imported',
      pricePerNight: venue.pricePerNightInEUR.toFixed(2),
      capacity: venue.capacity,
      albumId: venue.albumId,
      rating: venue.rating,
      hostId,
    },
  });
}

async function ensureVenueAddress(venue: VenueRow) {
  const currentVenue = await prisma.venue.findUnique({
    where: { id: venue.id },
    select: { addressId: true },
  });

  if (currentVenue?.addressId) {
    await prisma.venueAddress.update({
      where: { id: currentVenue.addressId },
      data: {
        street: '—',
        city: venue.location.name,
        country: 'PL',
        postalCode: venue.location.postalCode,
      },
    });
  } else {
    const venueAddress = await prisma.venueAddress.create({
      data: {
        street: '—',
        city: venue.location.name,
        country: 'PL',
        postalCode: venue.location.postalCode,
      },
      select: { id: true },
    });
    await prisma.venue.update({
      where: { id: venue.id },
      data: { addressId: venueAddress.id },
    });
  }
}

async function syncVenueFeatures(
  venueId: number,
  names: string[],
  featureMap: Map<string, number>,
) {
  for (const name of names) {
    const featureId = featureMap.get(name);
    if (!featureId) {
      continue;
    }
    await prisma.venueFeatures.upsert({
      where: { venueId_featureId: { venueId, featureId } },
      update: {},
      create: { venueId, featureId },
    });
  }
}

async function upsertVenueDetails(detail: VenueDetailsRow) {
  await prisma.venue.update({
    where: { id: detail.venueId },
    data: { description: detail.description },
  });

  await prisma.venueDetails.upsert({
    where: { venueId: detail.venueId },
    update: {
      numberOfReviews: detail.numberOfReviews,
      checkInHour: detail.checkInHour,
      checkOutHour: detail.checkOutHour,
      distanceFromCityCenterInKM: detail.distanceFromCityCenterInKM,
      sleepingMaxCapacity: detail.sleepingDetails.maxCapacity,
      sleepingBeds: detail.sleepingDetails.amountOfBeds,
      contactEmail: detail.contactDetails.email,
      contactPhone: detail.contactDetails.phone,
    },
    create: {
      venueId: detail.venueId,
      numberOfReviews: detail.numberOfReviews,
      checkInHour: detail.checkInHour,
      checkOutHour: detail.checkOutHour,
      distanceFromCityCenterInKM: detail.distanceFromCityCenterInKM,
      sleepingMaxCapacity: detail.sleepingDetails.maxCapacity,
      sleepingBeds: detail.sleepingDetails.amountOfBeds,
      contactEmail: detail.contactDetails.email,
      contactPhone: detail.contactDetails.phone,
    },
  });
}

async function main() {
  const holdingHostId = await ensureHoldingHostId();
  const raw = readFileSync(DB_PATH, 'utf-8');
  const data: DbDump = JSON.parse(raw);

  const allFeatureNames = Array.from(
    new Set([
      ...data.venues.flatMap((venueRow) => venueRow.features),
      ...data.venuesDetails.flatMap((venueDetailsRow) => venueDetailsRow.features ?? []),
    ]),
  );

  const featureMap = await buildFeatureMap(allFeatureNames);

  for (const venue of data.venues) {
    await ensureVenue(venue, holdingHostId);
    await ensureVenueAddress(venue);
    await syncVenueFeatures(venue.id, venue.features, featureMap);
  }

  for (const detail of data.venuesDetails) {
    await upsertVenueDetails(detail);
    await syncVenueFeatures(detail.venueId, detail.features ?? [], featureMap);
  }

  console.log('✅ Imported db.json → normalized schema (preserved IDs)');
  console.log('ℹ️ Reseed identity sequences if needed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
