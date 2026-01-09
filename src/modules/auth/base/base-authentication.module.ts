import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { BaseAuthenticationController } from './controllers/base-authentication.controller';
import { BaseAuthenticationService, NotificationService } from './services';
import { BackupCodesService } from '../two-factor-authentication/backup-codes/backup-codes.service';
import { UserAuth } from '../common/entities/user-auth.entity';
import { BackupCode } from './entities/backup-code.entity';

import { JwtAuthGuard } from './guards';
import { jwtModuleOptionsFactory } from './config/jwt.config';

import { TokensModule } from '../tokens/tokens.module';
import { DevicesModule } from '../devices/devices.module';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';
import { CommonModule } from '../common/common.module';

const jwtModuleAsyncOptions: JwtModuleAsyncOptions = {
	imports: [ConfigModule],
	useFactory: jwtModuleOptionsFactory,
	inject: [ConfigService],
};

const cacheConfig: { ttl: number; max: number } = {
	ttl: 900,
	max: 1000,
};

const throttlerModuleOptions: ThrottlerModuleOptions = [
	{
		ttl: 60000,
		limit: 10,
	},
];

@Module({
	// The providers that will be instantiated bu the Nest injector and that may be shared at least across this module.
	providers: [BaseAuthenticationService, BackupCodesService, JwtAuthGuard],
	// The set of controllers defined in this module which have to be instantiated.
	controllers: [BaseAuthenticationController],
	// The list of imported modules that export the providers which are required in this module.
	imports: [
		TypeOrmModule.forFeature([
			UserAuth,
			BackupCode,
		]),
		JwtModule.registerAsync(jwtModuleAsyncOptions),
		CacheModule.register(cacheConfig),
		ThrottlerModule.forRoot(throttlerModuleOptions),
		TokensModule,
		DevicesModule,
		PhoneVerificationModule,
		CommonModule,
	],
	// The subset of providers that are provided by this module and should be available in other modules
	// which import this module.
	exports: [BaseAuthenticationService, JwtAuthGuard],
})
export class BaseAuthenticationModule { }
