import { Injectable, Logger } from '@nestjs/common';
import { VerificationChannelStrategy } from './verification-channel.strategy';
import { SmsService } from '../services/sms/sms.service';
import { VerificationPurpose } from '../types/verification-purpose.type';

/**
 * SMS-based implementation of the VerificationChannelStrategy.
 * Sends verification codes via SMS using the SmsService.
 */
@Injectable()
export class SmsVerificationStrategy implements VerificationChannelStrategy {
	private readonly logger = new Logger(SmsVerificationStrategy.name);

	constructor(private readonly smsService: SmsService) {}

	/**
	 * Sends a verification code via SMS.
	 * @param recipient - The phone number to send the code to
	 * @param code - The verification code
	 * @param purpose - The purpose of the verification
	 */
	public async sendVerification(
		recipient: string,
		code: string,
		purpose: VerificationPurpose
	): Promise<void> {
		try {
			await this.smsService.sendVerificationCode(recipient, code, purpose);
		} catch (error) {
			// Log the error but don't fail - allow the verification process to continue
			if (process.env.NODE_ENV !== 'test') {
				this.logger.error(`Failed to send SMS to ${recipient}:`, error);
				this.logger.log(`Verification code for ${recipient}: ${code}`);
			}
			// Re-throw in production to handle properly
			if (process.env.NODE_ENV === 'production') {
				throw error;
			}
		}
	}

	/**
	 * Gets the channel name.
	 * @returns 'sms'
	 */
	public getChannelName(): string {
		return 'sms';
	}
}
