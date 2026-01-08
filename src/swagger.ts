import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';

function buildSwaggerDocument(port: number) {
	return new DocumentBuilder()
		.setTitle('Whispr Messenger')
		.setDescription('API documentation for Whispr Messenger')
		.setVersion('1.0')
		.addServer('/', 'Current Environment')
		.addServer(`http://127.0.0.1:${port}/api/v1`, 'Development (Local)')
		.addServer('https://whispr.epitech-msc2026.me/api/v1', 'Production')
		.build();
}

function createSwaggerCustomOptions(): SwaggerCustomOptions {
	return {
		useGlobalPrefix: false,
	};
}

export function createSwaggerDocumentation(
	app: NestExpressApplication,
	port: number,
	configService: ConfigService,
	globalPrefix?: string
) {
	const logger = new Logger('Swagger');
	const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);

	if (!swaggerEnabled) {
		logger.log('Swagger documentation is disabled');
		return;
	}

	const swaggerRoute = [globalPrefix, 'swagger'].filter(Boolean).join('/');

	const config = buildSwaggerDocument(port);
	const documentFactory = () =>
		SwaggerModule.createDocument(app, config, {
			ignoreGlobalPrefix: false,
		});

	const swaggerCustomOptions = createSwaggerCustomOptions();

	SwaggerModule.setup(swaggerRoute, app, documentFactory, swaggerCustomOptions);

	logger.log(`Swagger documentation available at: http://0.0.0.0:${port}/${swaggerRoute}`);
}