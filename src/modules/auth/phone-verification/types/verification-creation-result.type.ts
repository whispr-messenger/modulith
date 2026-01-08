import { VerificationCode } from './verification-code.interface';

/**
 * Result of verification data creation.
 * Contains the verification ID, plain code, and full verification data.
 */
export type VerificationCreationResult = {
	verificationId: string;
	code: string;
	verificationData: VerificationCode;
};
