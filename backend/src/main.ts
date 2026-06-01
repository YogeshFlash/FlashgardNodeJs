import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG } from './app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Need CORS for frontend requests
  app.enableCors();
  
  // Increase limits for large migration files
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '1000mb' }));
  app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

  app.setGlobalPrefix('api');

  await app.listen(CONFIG.BACKEND.PORT, '0.0.0.0');
}
bootstrap();
