import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';
import { createSwaggerDocumentation } from './swagger';
import { LoggingInterceptor } from './interceptors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.get<number>('HTTP_PORT', 3001);
  const globalPrefix = 'api';

  app.setGlobalPrefix(globalPrefix, {
    exclude: ['/'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  createSwaggerDocumentation(app, port, configService, globalPrefix);

  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);

  logger.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();