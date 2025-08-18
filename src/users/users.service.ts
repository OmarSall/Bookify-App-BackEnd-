import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PrismaError } from '../database/prisma-error.enum';
import { Prisma } from '@prisma/client';
import { UserDto } from './dto/user.dto';

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

  // Find user by id (with address)
  async getById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { address: true },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  // Create a new user (handles unique email)
  async create(user: UserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          phoneNumber: user.phoneNumber,
          address: user.address ? { create: user.address } : undefined,
        },
        include: { address: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintFailed) {
        throw new ConflictException('User with that email already exists');
      }
      throw error;
    }
  }
}
