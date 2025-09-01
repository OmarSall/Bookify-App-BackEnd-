export function toCardDto(venue: any) {
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

export function toDetailsDto(venue: any) {
  const card = toCardDto(venue);
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