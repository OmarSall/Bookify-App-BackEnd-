# Bookify — Backend

**Bookify Backend** is a REST API built with **NestJS** and **Prisma**, providing authentication and core domain endpoints for venues, bookings, favourites, and users. The project focuses on secure, production-oriented configuration and clean modular structure.

## Key Features

- **JWT authentication** (Passport strategy) with cookie support
- **Request validation** using `class-validator` + global `ValidationPipe`
- **Rate limiting** via `@nestjs/throttler` (global guard)
- **Security headers** with `helmet`
- **CORS allowlist** driven by `FRONTEND_URL` (supports multiple origins)
- Modular architecture: `authentication`, `users`, `venues`, `bookings`, `favourites`
- Database layer with **Prisma** + migrations

## Tech Stack

- NestJS
- Prisma + PostgreSQL (via `DATABASE_URL`)
- Passport JWT, @nestjs/jwt
- class-validator / class-transformer
- Joi config validation
- helmet, cookie-parser, throttler

## Getting Started (Development)

```bash
npm install
```
```bash
npm run prisma:generate
```
```bash
npm run prisma:migrate
```
```bash
npm run start:dev
```

