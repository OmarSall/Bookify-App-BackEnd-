import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function resolveAllowedOrigins(config: ConfigService) {
  const raw = config.get<string>('FRONTEND_URL') ?? '';
  const parsed = raw
    .split(',')
    .map(o => normalizeOrigin(o.trim()))
    .filter(Boolean);

  if (parsed.length === 0) {
    throw new Error(
      'FRONTEND_URL must be set in .env (comma-separated list of allowed origins)'
    );
  }

  return parsed;
}

function createCorsOptions(allowed: string[]) {
  return {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      const ok = allowed.includes(normalized);
      return cb(ok ? null : new Error(`CORS blocked for origin: ${origin}`), ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: [],
    optionsSuccessStatus: 204,
  } as const;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  process.on('beforeExit', async () => {
    await app.close();
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));

  const allowedOrigins = resolveAllowedOrigins(config);
  app.enableCors(createCorsOptions(allowedOrigins));

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}`);
  console.log('CORS allowed origins:', allowedOrigins);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
