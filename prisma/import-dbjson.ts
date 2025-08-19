import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// Types reflect old db.json structure (front shape)
type VenueJSON = {
  id: number;
  location: { postalCode: string; name: string };
  pricePerNightInEUR: number;
  rating: number;
  capacity: number;
  name: string;
  albumId: number;
  features: string[];
};

type VenueDetailsJSON = VenueJSON & {
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

type DB = { venues: VenueJSON[]; venuesDetails: VenueDetailsJSON[] };

async function upsertFeature(name: string) {
  return prisma.feature.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function main() {
  const raw = readFileSync('prisma/db.json', 'utf-8');
  const data: DB = JSON.parse(raw);

  // 1) Collect all features once
  const allFeatureNames = Array.from(
    new Set(
      data.venues.flatMap((venue) => venue.features).concat(
        data.venuesDetails.flatMap((venueDetail) => venueDetail.features ?? []),
      ),
    ),
  );

  const featureMap = new Map<string, number>();
  for (const featureName of allFeatureNames) {
    const feature = await upsertFeature(featureName);
    featureMap.set(feature.name, feature.id);
  }

  // 2) Upsert venues (keep original IDs!), then ensure address, then attach features
  for (const venue of data.venues) {
    const venueId = venue.id;

    // Unchecked upsert
    await prisma.venue.upsert({
      where: { id: venueId },
      update: {
        title: venue.name,
        slug: `${venue.name}-${venue.id}`.toLowerCase().replace(/\s+/g, '-'),
        description: 'Auto-imported',
        pricePerNight: venue.pricePerNightInEUR.toFixed(2),
        capacity: venue.capacity,
        albumId: venue.albumId,
        rating: venue.rating,
        hostId: 1, // assumes user id=1 exists
      },
      create: {
        id: venueId, // preserve original ID from db.json
        title: venue.name,
        slug: `${venue.name}-${venue.id}`.toLowerCase().replace(/\s+/g, '-'),
        description: 'Auto-imported',
        pricePerNight: venue.pricePerNightInEUR.toFixed(2),
        capacity: venue.capacity,
        albumId: venue.albumId,
        rating: venue.rating,
        hostId: 1, // connect by scalar FK in UncheckedCreateInput
      },
    });

    // Ensure address
    const current = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { addressId: true },
    });

    if (current?.addressId) {
      // Update existing address to match JSON
      await prisma.venueAddress.update({
        where: { id: current.addressId },
        data: {
          street: '—',
          city: venue.location.name,
          country: 'PL',
          postalCode: venue.location.postalCode,
        },
      });
    } else {
      // Create address and wire it to venue
      const addr = await prisma.venueAddress.create({
        data: {
          street: '—',
          city: venue.location.name,
          country: 'PL',
          postalCode: venue.location.postalCode,
        },
        select: { id: true },
      });
      await prisma.venue.update({
        where: { id: venueId },
        data: { addressId: addr.id },
      });
    }

    // Attach features from venue.features (idempotent)
    for (const featureName of venue.features) {
      const featureId = featureMap.get(featureName);
      if (!featureId) continue;
      await prisma.venueFeatures.upsert({
        where: { venueId_featureId: { venueId, featureId } },
        update: {},
        create: { venueId, featureId },
      });
    }
  }

  // 3) Upsert details and merge any extra features from details
  for (const detail of data.venuesDetails) {
    // Update description from details payload
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

    // Extra tags from details.features (idempotent)
    for (const featureName of detail.features ?? []) {
      const featureId = featureMap.get(featureName);
      if (!featureId) continue;
      await prisma.venueFeatures.upsert({
        where: { venueId_featureId: { venueId: detail.venueId, featureId } },
        update: {},
        create: { venueId: detail.venueId, featureId },
      });
    }
  }

  console.log('✅ Imported db.json → normalized schema (with preserved IDs)');
  console.log('ℹ️  Remember to reseed identity sequences if needed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
