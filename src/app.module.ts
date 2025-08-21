import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthenticationModule } from './authentication/authentication.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { VenuesModule } from './venues/venues.module';
import { BookingsModule } from './bookings/bookings.module';
import { FavouritesModule } from './favourites/favourites.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(10),
          limit: 5,
        },
      ],
    }),
    // Global config with env validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.number().required(),
        JWT_ISSUER: Joi.string().optional(),
        JWT_AUDIENCE: Joi.string().optional(),
        FRONTEND_URL: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
      }),
    }),
    DatabaseModule,
    UsersModule,
    AuthenticationModule,
    VenuesModule,
    BookingsModule,
    FavouritesModule,
  ],
  providers: [
    {
      provide: APP_GUARD, useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
}
