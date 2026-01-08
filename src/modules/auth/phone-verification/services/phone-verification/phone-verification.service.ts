import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
	VerificationRequestDto,
	VerificationConfirmDto,
	VerificationRequestResponseDto,
	VerificationConfirmResponseDto,
	VerificationLoginResponseDto
} from '../../dto';
import { UserAuthService } from '../../../common/services/user-auth.service';
import { VerificationCode } from '../../types/verification-code.interface';
import { VerificationPurpose } from '../../types/verification-purpose.type';
import { VerificationCreationResult } from '../../types/verification-creation-result.type';
import { VerificationCodeGeneratorService } from '../verification-code-generator/verification-code-generator.service';
import { PhoneNumberService } from '../phone-number/phone-number.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import type { VerificationRepository } from '../../repositories/verification.repository';
import type { VerificationChannelStrategy } from '../../strategies/verification-channel.strategy';

/**
 * Service responsible for phone verification workflow orchestration.
 * Uses injected dependencies to handle verification requests, code validation,
 * and user authentication flows.
 */
@Injectable()
export class PhoneVerificationService {
	private readonly logger = new Logger(PhoneVerificationService.name);
	private readonly isDemoMode: boolean;
	private readonly VERIFICATION_TTL = 15 * 60; // 15 minutes in seconds
	private readonly MAX_ATTEMPTS = 5;
	private readonly RATE_LIMIT_TTL = 60 * 60; // 1 hour in seconds
	private readonly MAX_REQUESTS_PER_HOUR = 5;

	constructor(
		@Inject('VerificationRepository') private readonly verificationRepo: VerificationRepository,
		private readonly codeGenerator: VerificationCodeGeneratorService,
		private readonly phoneService: PhoneNumberService,
		private readonly rateLimitService: RateLimitService,
		@Inject('VerificationChannelStrategy') private readonly verificationChannel: VerificationChannelStrategy,
		private readonly configService: ConfigService,
		private readonly userAuthService: UserAuthService
	) {
		this.isDemoMode = this.configService.get<string>('DEMO_MODE') === 'true';
	}

	/**
	 * Requests a verification code for a phone number.
	 * @param phoneNumber - The phone number to verify
	 * @param purpose - The purpose of the verification (registration or login)
	 * @returns The verification ID and optionally the code (in demo mode)
	 */
	private async requestVerification(phoneNumber: string, purpose: VerificationPurpose): Promise<VerificationRequestResponseDto> {
		const normalizedPhone = this.phoneService.normalize(phoneNumber);

		await this.checkRateLimit(normalizedPhone);

		const { verificationId, code, verificationData } = await this.createVerificationData(normalizedPhone, purpose);

		await this.verificationRepo.save(verificationId, verificationData, this.VERIFICATION_TTL * 1000);

		await this.incrementRateLimit(normalizedPhone);

		await this.sendVerificationCode(normalizedPhone, code, purpose);

		return this.buildVerificationResponse(verificationId, code);
	}

	/**
	 * Checks if the phone number has exceeded the rate limit.
	 * @param phoneNumber - The normalized phone number
	 * @throws HttpException if rate limit is exceeded
	 */
	private async checkRateLimit(phoneNumber: string): Promise<void> {
		const key = `rate_limit:${phoneNumber}`;
		const errorMessage = 'Too many verification code requests';

		await this.rateLimitService.checkLimit(key, this.MAX_REQUESTS_PER_HOUR, this.RATE_LIMIT_TTL, errorMessage);
	}

	/**
	 * Increments the rate limit counter for the phone number.
	 * @param phoneNumber - The normalized phone number
	 */
	private async incrementRateLimit(phoneNumber: string): Promise<void> {
		const key = `rate_limit:${phoneNumber}`;
		await this.rateLimitService.increment(key, this.RATE_LIMIT_TTL);
	}

	/**
	 * Creates verification data with a new ID and hashed code.
	 * @param phoneNumber - The normalized phone number
	 * @param purpose - The purpose of the verification
	 * @returns Object containing verification ID, plain code, and verification data
	 */
	private async createVerificationData(phoneNumber: string, purpose: VerificationPurpose): Promise<VerificationCreationResult> {
		const verificationId = uuidv4();
		const code = this.codeGenerator.generateCode();
		const hashedCode = await this.codeGenerator.hashCode(code);
		const expirationTime =  Date.now() + this.VERIFICATION_TTL * 1000;

		const verificationData: VerificationCode = {
			phoneNumber,
			hashedCode,
			purpose,
			attempts: 0,
			expiresAt: expirationTime,
		};

		return { verificationId, code, verificationData };
	}

	/**
	 * Sends the verification code through the configured channel.
	 * Logs errors but doesn't throw to allow the verification process to continue.
	 * @param phoneNumber - The phone number to send to
	 * @param code - The verification code
	 * @param purpose - The purpose of the verification
	 */
	private async sendVerificationCode(phoneNumber: string, code: string, purpose: VerificationPurpose): Promise<void> {
		try {
			await this.verificationChannel.sendVerification(phoneNumber, code, purpose);
		} catch (error) {
			if (process.env.NODE_ENV !== 'test') {
				this.logger.error('Failed to send verification code:', error);
				this.logger.log(`Verification code for ${phoneNumber}: ${code}`);
			}
		}
	}

	/**
	 * Builds the verification response based on demo mode configuration.
	 * @param verificationId - The verification ID
	 * @param code - The verification code
	 * @returns Response with ID and optionally the code
	 */
	private buildVerificationResponse(
		verificationId: string,
		code: string
	): VerificationRequestResponseDto {
		if (this.isDemoMode) {
			this.logger.debug('Demo mode is activated: sending verification code in response payload.');
			return { verificationId, code };
		}

		return { verificationId };
	}

	/**
	 * Verifies a code against a verification ID.
	 * @param verificationId - The verification ID
	 * @param code - The code to verify (empty string to just retrieve verified data)
	 * @returns The verification data
	 * @throws BadRequestException if code is invalid or verification not found
	 * @throws HttpException with TOO_MANY_REQUESTS if max attempts exceeded
	 */
	private async verifyCode(verificationId: string, code: string): Promise<VerificationCode> {
		const verificationData = await this.verificationRepo.findById(verificationId);

		if (!verificationData) {
			throw new BadRequestException('Invalid or expired verification code');
		}

		// If already verified and no code provided, return the data
		if (verificationData.verified && code === '') {
			return verificationData;
		}

		if (verificationData.attempts >= this.MAX_ATTEMPTS) {
			await this.verificationRepo.delete(verificationId);
			throw new HttpException('Too many verification attempts', HttpStatus.TOO_MANY_REQUESTS);
		}

		const isValid = await this.codeGenerator.compareCode(code, verificationData.hashedCode);

		if (!isValid) {
			verificationData.attempts++;
			await this.verificationRepo.update(
				verificationId,
				verificationData,
				Math.ceil(verificationData.expiresAt - Date.now())
			);
			throw new BadRequestException('Incorrect verification code');
		}

		return verificationData;
	}

	/**
	 * Marks a verification as confirmed and updates it in storage.
	 * @param verificationId - The verification ID
	 * @param verificationData - The verification data to mark as verified
	 */
	private async markVerificationAsConfirmed(
		verificationId: string,
		verificationData: VerificationCode
	): Promise<void> {
		verificationData.verified = true;
		await this.verificationRepo.update(
			verificationId,
			verificationData,
			Math.ceil(verificationData.expiresAt - Date.now())
		);
	}

	/**
	 * Retrieves a confirmed verification data.
	 * @param verificationId - The verification ID
	 * @returns The verification data if it has been confirmed
	 * @throws BadRequestException if verification not found or not confirmed
	 */
	public async getConfirmedVerification(verificationId: string): Promise<VerificationCode> {
		const verificationData = await this.verificationRepo.findById(verificationId);

		if (!verificationData) {
			throw new BadRequestException('Invalid or expired verification code');
		}

		if (!verificationData.verified) {
			throw new BadRequestException('Verification code has not been confirmed yet');
		}

		return verificationData;
	}

	/**
	 * Consumes a verification, deleting it from storage.
	 * @param verificationId - The verification ID to consume
	 */
	public async consumeVerification(verificationId: string): Promise<void> {
		await this.verificationRepo.delete(verificationId);
	}

	/**
	 * Requests a verification code for user registration.
	 * @param dto - The verification request data
	 * @returns The verification ID and optionally the code (in demo mode)
	 * @throws ConflictException if user already exists
	 */
	public async requestRegistrationVerification(dto: VerificationRequestDto): Promise<VerificationRequestResponseDto> {
		const existingUser = await this.userAuthService.findByPhoneNumber(dto.phoneNumber);

		if (existingUser) {
			throw new ConflictException('An account with this phone number already exists.');
		}

		return this.requestVerification(dto.phoneNumber, 'registration');
	}

	/**
	 * Confirms a registration verification code.
	 * @param dto - The verification confirmation data
	 * @returns Object indicating verification success
	 */
	public async confirmRegistrationVerification(dto: VerificationConfirmDto): Promise<VerificationConfirmResponseDto> {
		const verificationData = await this.verifyCode(dto.verificationId, dto.code);
		await this.markVerificationAsConfirmed(dto.verificationId, verificationData);
		return { verified: true };
	}

	/**
	 * Requests a verification code for user login.
	 * @param dto - The verification request data
	 * @returns The verification ID and optionally the code (in demo mode)
	 * @throws BadRequestException if user doesn't exist
	 */
	public async requestLoginVerification(dto: VerificationRequestDto): Promise<VerificationRequestResponseDto> {
		const user = await this.userAuthService.findByPhoneNumber(dto.phoneNumber);

		if (!user) {
			throw new BadRequestException('No account found with this phone number');
		}

		return this.requestVerification(dto.phoneNumber, 'login');
	}

	/**
	 * Confirms a login verification code.
	 * @param dto - The verification confirmation data
	 * @returns Object indicating verification success and whether 2FA is required
	 */
	public async confirmLoginVerification(dto: VerificationConfirmDto): Promise<VerificationLoginResponseDto> {
		const verificationData = await this.verifyCode(dto.verificationId, dto.code);
		await this.markVerificationAsConfirmed(dto.verificationId, verificationData);

		const user = await this.userAuthService.findByPhoneNumber(verificationData.phoneNumber);

		if (!user) {
			throw new BadRequestException('User not found');
		}

		return { verified: true, requires2FA: user.twoFactorEnabled };
	}
}
