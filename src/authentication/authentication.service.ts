import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/sign-up.dto';
import { LogInDto } from './dto/log-in.dto';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './token-payload.interface';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
  }

  async signUp(data: SignUpDto) {
    // Hash password before persisting
    const hash = await bcrypt.hash(data.password, 10);
    return this.users.create({
      name: data.name,
      email: data.email,
      password: hash,
      phoneNumber: data.phoneNumber,
      address: data.address
        ? {
          street: data.address.street,
          city: data.address.city,
          country: data.address.country,
        }
        : undefined,
    });
  }

  private async getUserByEmail(email: string) {
    try {
      return await this.users.getByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new WrongCredentialsException();
      }
      throw error;
    }
  }

  private async verifyPassword(plain: string, hash: string) {
    const ok = await bcrypt.compare(plain, hash);
    if (!ok) {
      throw new WrongCredentialsException();
    }
  }

  async getAuthenticatedUser(data: LogInDto) {
    const user = await this.getUserByEmail(data.email);
    await this.verifyPassword(data.password, user.password);
    return user;
  }

  private cookieIsSecure() {
    // Read from env (string) to avoid loose truthy checks
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return secure || isProd;
  }

  getCookieWithJwtToken(userId: number) {
    const payload: TokenPayload = { userId };
    const token = this.jwt.sign(payload);
    const maxAge = this.config.get<number>('JWT_EXPIRATION_TIME');

    // Base attributes
    let cookie = `Authentication=${token}; HttpOnly; Path=/; Max-Age=${maxAge}`;

    // In cross-site scenarios under HTTPS, Secure+SameSite=None is required.
    if (this.cookieIsSecure()) {
      cookie += `; Secure; SameSite=None`;
    }
    return cookie;
  }

  getCookieForLogOut() {
    let cookie = `Authentication=; HttpOnly; Path=/; Max-Age=0`;
    if (this.cookieIsSecure()) {
      cookie += `; Secure; SameSite=None`;
    }
    return cookie;
  }
}
