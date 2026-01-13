import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix for API
  app.setGlobalPrefix('api');

  await app.listen(3001);
  console.log('Backend running on http://localhost:3001');
}
bootstrap();
