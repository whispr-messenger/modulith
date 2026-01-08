export interface VerificationCode {
	phoneNumber: string;
	hashedCode: string;
	purpose: 'registration' | 'login' | 'recovery';
	attempts: number;
	expiresAt: number;
	verified?: boolean;
}
