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
  app.use(helmet({
    // Allow cross-origin requests for APIs; adjust if serving static assets
    crossOriginResourcePolicy: false,
  }));

  // Normalize origins by removing a trailing slash
  const normalize = (u: string) => u.replace(/\/$/, '');

  // Support multiple frontends if needed: FRONTEND_URL as comma-separated list
  const envList = (config.get<string>('FRONTEND_URL') ?? '')
    .split(',')
    .map(origin => normalize(origin.trim()))
    .filter(Boolean);

  // Fallback to common dev origins when FRONTEND_URL is not set
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];

  // Build final whitelist
  const allowed = (envList.length ? envList : defaults).map(normalize);

  // CORS for cookie-based auth
  app.enableCors({
    /**
     * Use a function so Postman/cURL (no Origin header) still work,
     * and only configured frontends are allowed.
     */
    origin: (origin, callback) => {
      if (!origin) {
        // no Origin → allow (curl, Postman, backend-to-backend calls)
        return callback(null, true);
      }
      const incoming = normalize(origin);
      if (allowed.includes(incoming)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true, // allow cookies/Authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: [], // cookies do not need to be exposed
    optionsSuccessStatus: 204, // some legacy browsers choke on 200 for preflight
  });

  // Read port from env or default to 3000
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}`);
  console.log('CORS allowed origins:', allowed);
}

bootstrap().catch((err) => {
  // Ensure the process exits on bootstrap failure (useful for containers/PM2)
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
