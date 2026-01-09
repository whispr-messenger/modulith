import { VerificationPurpose } from '../types/verification-purpose.type';

/**
 * Strategy interface for verification channels.
 * Allows supporting multiple verification channels (SMS, email, authenticator app, etc.)
 * following the Strategy pattern.
 */
export interface VerificationChannelStrategy {
	/**
	 * Sends a verification code through this channel.
	 * @param recipient - The recipient identifier (phone number, email, etc.)
	 * @param code - The verification code to send
	 * @param purpose - The purpose of the verification
	 */
	sendVerification(
		recipient: string,
		code: string,
		purpose: VerificationPurpose
	): Promise<void>;

	/**
	 * Gets the name of this verification channel.
	 * @returns The channel name (e.g., 'sms', 'email', 'authenticator')
	 */
	getChannelName(): string;
}
