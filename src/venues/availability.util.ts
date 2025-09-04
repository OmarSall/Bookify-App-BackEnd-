import type { AvailabilityStatus } from "./venue.types";

export function computeAvailabilityStatus(
  hasRange: boolean,
  venueBookings: Array<{ userId: number }> | undefined,
  currentUserId?: number
): AvailabilityStatus {
  if (!hasRange) {
    return "unknown";
  }
  const overlaps = venueBookings?.length ?? 0;
  if (overlaps === 0) {
    return "available";
  }
  const overlapMine = currentUserId
    ? (venueBookings ?? []).some((booking) => booking.userId === currentUserId)
    : false;
  return overlapMine ? "booked_by_me" : "booked";
}
