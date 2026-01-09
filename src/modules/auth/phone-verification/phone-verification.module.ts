import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { PhoneVerificationService } from './services/phone-verification/phone-verification.service';
import { SmsService } from './services/sms/sms.service';
import { PhoneVerificationController } from './controllers/phone-verification.controller';
import { UserAuth } from '../common/entities/user-auth.entity';
import { CommonModule } from '../common/common.module';

@Module({
	providers: [PhoneVerificationService, SmsService],
	controllers: [PhoneVerificationController],
	imports: [TypeOrmModule.forFeature([UserAuth]), CacheModule.register(), CommonModule],
	exports: [PhoneVerificationService],
})
export class PhoneVerificationModule { }
