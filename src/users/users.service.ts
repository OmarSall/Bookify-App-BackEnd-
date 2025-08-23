import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PrismaError } from '../database/prisma-error.enum';
import { Prisma, BookingStatus } from '@prisma/client';
import { UserDto } from './dto/user.dto';
import type { User, Address } from '@prisma/client';

type SafeUser = Omit<User, 'password'> &
  {
    address:
      Address | null
  };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {
  }

  // Find user by email (with address)
  async getByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { address: true },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  // Find user by id WITHOUT password; include address
  async getById(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      // omit password by selecting only needed fields
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        address: true,
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  // Create a new user and return a SafeUser (without password)
  async create(user: UserDto): Promise<SafeUser> {
    try {
      return await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.password, // already hashed
          phoneNumber: user.phoneNumber,
          address: user.address ? { create: user.address } : undefined,
        },
        // select only safe fields in the response
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
          address: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintFailed) {
        throw new ConflictException('User with that email already exists');
      }
      throw error;
    }
  }

  async updatePhoneNumber(userId: number, phoneNumber: string): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phoneNumber },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        address: true,
      },
    });
  }

  /**
   * Account deletion workflow:
   *  - Collect venues hosted by the user.
   *  - For bookings of those venues: UPDATE status -> CANCELLED, then DELETE (Booking.venue has FK Restrict).
   *  - Delete the user's venues (+ clean up associated VenueAddress records).
   *  - For the user's own bookings as a guest: UPDATE status -> CANCELLED (kept as history in DB).
   *  - Finally, delete the user (their Address/Favourite will be removed via cascade per your schema).
   */
  async deleteUserCascadeVenuesAndCancelBookings(userId: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1) Ensure the user exists
        const exists = await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
          },
        });
        if (!exists) {
          throw new NotFoundException('User not found');
        }

        // 2) Venues hosted by the user (collect id + addressId)
        const venues = await tx.venue.findMany({
          where: { hostId: userId },
          select: { id: true, addressId: true },
        });
        const venueIds = venues.map(venue => venue.id);
        const addressIds = venues.map(venue => venue.addressId).filter((x): x is number => x !== null);

        // 3) Bookings FOR THESE VENUES -> CANCELLED, then DELETE (so venue deletion is not blocked by FK Restrict)
        if (venueIds.length) {
          await tx.booking.updateMany({
            where: { venueId: { in: venueIds } },
            data: { status: BookingStatus.CANCELLED },
          });
          await tx.booking.deleteMany({ where: { venueId: { in: venueIds } } });
        }

        // 4) Delete venues hosted by the user
        if (venueIds.length) {
          await tx.venue.deleteMany({ where: { id: { in: venueIds } } });
        }

        // 5) Clean up orphaned VenueAddress records (Venue.address uses onDelete: SetNull; addressId is unique)
        if (addressIds.length) {
          await tx.venueAddress.deleteMany({ where: { id: { in: addressIds } } });
        }

        // 6) User's own bookings as a guest -> set status to CANCELLED (kept for history/analytics)
        await tx.booking.updateMany({
          where: { userId },
          data: {
            status: BookingStatus.CANCELLED,
            userId: { set: null },
          },
        });

        // 7) Remove user's favourites (if not ON DELETE CASCADE)
        await tx.favourite.deleteMany({ where: { userId } });

        // 8) Finally, delete the user
        await tx.user.delete({ where: { id: userId } });
      });
  } catch(error: any) {
    if (error?.code === 'P2003') {
      console.error('FK constraint failed (P2003) while deleting user:', {
        message: error.message,
        meta: error.meta,
      });
    } else {
      console.error('Unexpected error while deleting user:', error);
    }
    throw error;
  }

}
}
