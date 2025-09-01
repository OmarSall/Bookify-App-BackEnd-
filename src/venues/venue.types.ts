export type VenueType = "studio" | "apartment" | "house" | "villa";
export type AvailabilityStatus = "available" | "booked" | "booked_by_me" | "unknown";

export const TYPE_CAPACITY_RULES: Record<VenueType, { gte?: number; lte?: number }> = {
  studio: { lte: 2 },
  apartment: { lte: 3 },
  house: { gte: 4, lte: 8 },
  villa: { gte: 9 },
};