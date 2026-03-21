import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3001', 'https://TON-PROJET.vercel.app'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: false,
  });

  const port = 3000;
  /* const port = process.env.PORT || 3000; */
  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}`);
  console.log('port', port);
}

bootstrap();
