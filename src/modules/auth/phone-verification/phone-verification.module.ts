import { Module } from '@nestjs/common';
import { PhoneVerificationService } from './services/phone-verification/phone-verification.service';
import { SmsService } from './services/sms/sms.service';
import { PhoneVerificationController } from './controllers/phone-verification.controller';
import { VerificationCodeGeneratorService } from './services/verification-code-generator/verification-code-generator.service';
import { PhoneNumberService } from './services/phone-number/phone-number.service';
import { RateLimitService } from './services/rate-limit/rate-limit.service';
import { CacheVerificationRepository } from './repositories/cache-verification.repository';
import { SmsVerificationStrategy } from './strategies/sms-verification.strategy';
import { CommonModule } from '../common/common.module';

@Module({
	providers: [
		PhoneVerificationService,
		SmsService,
		VerificationCodeGeneratorService,
		PhoneNumberService,
		RateLimitService,
		{
			provide: 'VerificationRepository',
			useClass: CacheVerificationRepository,
		},
		{
			provide: 'VerificationChannelStrategy',
			useClass: SmsVerificationStrategy,
		},
	],
	controllers: [PhoneVerificationController],
	imports: [CommonModule],
	exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
