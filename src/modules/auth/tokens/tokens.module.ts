import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokensController } from './controllers/tokens.controller';
import { TokensService } from './services/tokens.service';
import { jwtModuleOptionsFactory } from '../base/config/jwt.config';

@Module({
	providers: [TokensService],
	controllers: [TokensController],
	imports: [
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: jwtModuleOptionsFactory,
			inject: [ConfigService],
		}),
		CacheModule.register(),
	],
	exports: [TokensService, JwtModule],
})
export class TokensModule { }
