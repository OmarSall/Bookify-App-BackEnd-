import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Call Nest’s shutdown hooks on OS signals
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);

  // Also close when Node’s event loop is about to exit
  process.on('beforeExit', async () => {
    await app.close();
  });

  // Parse cookies for reading the JWT cookie
  app.use(cookieParser());

  // Whitelist & transform for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));

  // Basic security headers
  app.use(helmet());

  // Normalize origins by removing a trailing slash
  const normalize = (u: string) => u.replace(/\/$/, '');

  // Support multiple frontends if needed: FRONTEND_URL as comma-separated list
  const allowed = (config.get<string>('FRONTEND_URL') ?? '')
    .split(',')
    .map(origin => normalize(origin.trim()))
    .filter(Boolean);

  // CORS for cookie-based auth
  app.enableCors({
    /**
     * Use a function so Postman/cURL (no Origin header) still work,
     * and only configured frontends are allowed.
     */
    origin: (origin, callback) => {
      if (!origin)
        return callback(null, true);          // allow non-browser clients
      const incoming = normalize(origin);
      if (allowed.includes(incoming))
        return callback(null, true);
      return callback(null, false);
    },
    credentials: true, // allow cookies/Authorization headers
  });

  // Read port from env or default to 3000
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
