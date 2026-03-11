import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Need CORS for frontend requests
  app.enableCors();
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
