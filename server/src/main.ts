import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { host, port } from './config.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Close the database pool when the process is asked to stop.
  app.enableShutdownHooks();
  await app.listen(port(), host());
}
await bootstrap();
