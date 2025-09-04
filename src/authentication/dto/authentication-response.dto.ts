import { Exclude, Transform } from 'class-transformer';
import { Address, User } from '@prisma/client';

// Serialized response sent back to the client
export class AuthenticationResponseDto implements User {
  id!: number;
  email!: string;
  name!: string;

  @Transform(({ value: phoneNumber }) => {
    if (!phoneNumber) {
      return null;
    }
    const len = phoneNumber.length;
    const visible = Math.min(3, len);
    return `${'*'.repeat(len - visible)}${phoneNumber.slice(len - visible)}`;
  })
  phoneNumber!: string | null;

  @Exclude()
  password!: string;

  addressId!: number | null;
  address?: Address | null;

  createdAt!: Date;
  updatedAt!: Date;
}
