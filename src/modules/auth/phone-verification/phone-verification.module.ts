import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhoneVerificationService } from './services/phone-verification/phone-verification.service';
import { SmsService } from './services/sms/sms.service';
import { PhoneVerificationController } from './controllers/phone-verification.controller';
import { UserAuth } from '../common/entities/user-auth.entity';

@Module({
	providers: [PhoneVerificationService, SmsService],
	controllers: [PhoneVerificationController],
	imports: [TypeOrmModule.forFeature([UserAuth])],
	exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
