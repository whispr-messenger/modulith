import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { PhoneAuthenticationController } from './controllers/phone-authentication.controller';
import { PhoneAuthenticationService, NotificationService } from './services';

import { jwtModuleOptionsFactory } from './config/jwt.config';

import { TokensModule } from '../tokens/tokens.module';
import { DevicesModule } from '../devices/devices.module';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';
import { UserAuthService } from '../common/services/user-auth.service';
import { CommonModule } from '../common/common.module';
import { TwoFactorAuthenticationModule } from '../two-factor-authentication/two-factor-authentication.module';

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
	providers: [PhoneAuthenticationService],
	// The set of controllers defined in this module which have to be instantiated.
	controllers: [PhoneAuthenticationController],
	// The list of imported modules that export the providers which are required in this module.
	imports: [
		JwtModule.registerAsync(jwtModuleAsyncOptions),
		CacheModule.register(cacheConfig),
		ThrottlerModule.forRoot(throttlerModuleOptions),
		CommonModule,
		DevicesModule,
		PhoneVerificationModule,
		TokensModule,
		TwoFactorAuthenticationModule,
	],
	// The subset of providers that are provided by this module and should be available in other modules
	// which import this module.
	exports: [PhoneAuthenticationService],
})
export class PhoneAuthenticationModule {}
