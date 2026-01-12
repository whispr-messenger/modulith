import { VerificationPurpose } from './verification-purpose.type'

export interface VerificationCode {
    phoneNumber: string;
    hashedCode: string;
    purpose: VerificationPurpose;
    attempts: number;
    expiresAt: number;
}