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

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phoneNumber: true,
  createdAt: true,
  updatedAt: true,
  address: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {
  }

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

  async getById(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

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
        select: SAFE_USER_SELECT,
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
      select: SAFE_USER_SELECT,
    });
  }

  async deleteUserCascadeVenuesAndCancelBookings(userId: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
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

        const venues = await tx.venue.findMany({
          where: { hostId: userId },
          select: { id: true, addressId: true },
        });
        const venueIds = venues.map(venue => venue.id);
        const addressIds = venues.map(venue => venue.addressId).filter((x): x is number => x !== null);

        if (venueIds.length) {
          await tx.booking.updateMany({
            where: { venueId: { in: venueIds } },
            data: { status: BookingStatus.CANCELLED },
          });
          await tx.booking.deleteMany({ where: { venueId: { in: venueIds } } });
        }

        if (venueIds.length) {
          await tx.venue.deleteMany({ where: { id: { in: venueIds } } });
        }

        if (addressIds.length) {
          await tx.venueAddress.deleteMany({ where: { id: { in: addressIds } } });
        }

        await tx.booking.updateMany({
          where: { userId },
          data: {
            status: BookingStatus.CANCELLED,
            userId: { set: null },
          },
        });

        await tx.favourite.deleteMany({ where: { userId } });

        await tx.user.delete({ where: { id: userId } });
      });
    } catch (error: any) {
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
