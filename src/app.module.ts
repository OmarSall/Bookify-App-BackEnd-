import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthenticationModule } from './authentication/authentication.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    // Global config with env validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.number().required(),
        FRONTEND_URL: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
      }),
    }),
    DatabaseModule,
    UsersModule,
    AuthenticationModule,
  ],
})
export class AppModule {
}
