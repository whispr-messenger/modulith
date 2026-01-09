import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';
import { createSwaggerDocumentation } from './swagger';
import { LoggingInterceptor } from './interceptors';

// Gestionnaire global des erreurs non capturées
const logger = new Logger('UnhandledErrors');

process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', reason?.stack || reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.stack);
  // En production, on pourrait vouloir gracefully shutdown
  // process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const bootstrapLogger = new Logger('Bootstrap');
  const port = configService.get<number>('HTTP_PORT', 3001);
  const globalPrefix = 'api';

  app.setGlobalPrefix(globalPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  createSwaggerDocumentation(app, port, configService, globalPrefix);

  app.useGlobalInterceptors(new LoggingInterceptor());

  // Gérer les signaux de shutdown proprement
  app.enableShutdownHooks();

  await app.listen(port);

  bootstrapLogger.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();