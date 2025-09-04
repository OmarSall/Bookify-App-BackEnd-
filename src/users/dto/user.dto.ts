// DTO used internally by service (no class-validator here)
export class UserDto {
  email!: string;
  name!: string;
  password!: string; // already hashed
  phoneNumber?: string;
  address?: {
    street: string;
    city: string;
    country: string;
  };
}
