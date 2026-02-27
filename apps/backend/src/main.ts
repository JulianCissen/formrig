import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger }      from '@nestjs/common';
import { AppModule }   from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS for Angular dev server
  app.enableCors({ origin: 'http://localhost:4200' });

  // Prefix all routes with /api so Angular proxy config routes correctly
  app.setGlobalPrefix('api');

  await app.listen(3000);
  logger.log('Backend listening on http://localhost:3000');
}

bootstrap();
