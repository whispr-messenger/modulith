import {
	BadRequestException,
	ConflictException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { VerificationRequestDto, VerificationConfirmDto } from '../../../../base/dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { FindOneOptions, Repository } from 'typeorm';
import { UserAuth } from '../../../common/entities/user-auth.entity';
import { SmsService } from '../sms/sms.service';
import { UserAuthService } from '../../../common/services/user-auth.service';
import { VerificationCode } from '../../types/verification-code.interface';
import { verificationPurpose } from '../../types/verification-purpose.type';
import { VerificationRequestResponse } from '../../types/verification-request-response.interface';

@Injectable()
export class PhoneVerificationService {
	private readonly logger = new Logger(PhoneVerificationService.name);
	private readonly isDemoMode; 
	private readonly VERIFICATION_TTL = 15 * 60;
	private readonly MAX_ATTEMPTS = 5;
	private readonly RATE_LIMIT_TTL = 60 * 60;
	private readonly MAX_REQUESTS_PER_HOUR = 5;
	private readonly BCRYPT_ROUNDS = 10;

	constructor(
		@InjectRepository(UserAuth)
		private readonly userAuthRepository: Repository<UserAuth>,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		private readonly smsService: SmsService,
		private readonly configService: ConfigService,
		private readonly userAuthService: UserAuthService
	) {
		this.isDemoMode = this.configService.get<string>('DEMO_MODE') === 'true';
	}

	async requestVerification(
		phoneNumber: string,
		purpose: verificationPurpose
	): Promise<VerificationRequestResponse> {
		const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

		await this.checkRateLimit(normalizedPhone);

		const verificationId = uuidv4();
		const code = this.generateCode();
		const hashedCode = await bcrypt.hash(code, this.BCRYPT_ROUNDS);

		const verificationData: VerificationCode = {
			phoneNumber: normalizedPhone,
			hashedCode,
			purpose,
			attempts: 0,
			expiresAt: Date.now() + this.VERIFICATION_TTL * 1000,
		};

		await this.cacheManager.set(
			`verification:${verificationId}`,
			JSON.stringify(verificationData),
			this.VERIFICATION_TTL * 1000
		);

		await this.incrementRateLimit(normalizedPhone);

		// Send SMS in production, log in development
		try {
			await this.smsService.sendVerificationCode(normalizedPhone, code, purpose);
		} catch (error) {
			// If SMS fails, still return the verification ID but log the error
			if (process.env.NODE_ENV !== 'test') {
				this.logger.error('Failed to send SMS:', error);
				this.logger.log(`Verification code for ${normalizedPhone}: ${code}`);
			}
		}

		if (this.isDemoMode) {
			this.logger.debug('Demo mode is activated: sending verification code in response payload.');
			return { verificationId, code };
		}

		return { verificationId };
	}

	async verifyCode(verificationId: string, code: string): Promise<VerificationCode> {
		const key = `verification:${verificationId}`;
		const data = await this.cacheManager.get<string>(key);

		if (!data) {
			throw new BadRequestException('Code de vérification invalide ou expiré');
		}

		const verificationData: VerificationCode = JSON.parse(data);

		// Si déjà vérifié et aucun code fourni, retourner les données
		if (verificationData.verified && code === '') {
			return verificationData;
		}

		if (verificationData.attempts >= this.MAX_ATTEMPTS) {
			await this.cacheManager.del(key);
			throw new HttpException('Trop de tentatives de vérification', HttpStatus.TOO_MANY_REQUESTS);
		}

		const isValid = await bcrypt.compare(code, verificationData.hashedCode);

		if (!isValid) {
			verificationData.attempts++;
			await this.cacheManager.set(
				key,
				JSON.stringify(verificationData),
				Math.ceil(verificationData.expiresAt - Date.now())
			);
			throw new BadRequestException('Code de vérification incorrect');
		}

		return verificationData;
	}

	async consumeVerification(verificationId: string): Promise<void> {
		await this.cacheManager.del(`verification:${verificationId}`);
	}

	private generateCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	private normalizePhoneNumber(phoneNumber: string): string {
		try {
			const parsed = parsePhoneNumberWithError(phoneNumber);
			if (!parsed || !parsed.isValid()) {
				throw new BadRequestException('Numéro de téléphone invalide');
			}
			return parsed.format('E.164');
		} catch {
			throw new BadRequestException('Numéro de téléphone invalide');
		}
	}

	private async checkRateLimit(phoneNumber: string): Promise<void> {
		const key = `rate_limit:${phoneNumber}`;
		const count = await this.cacheManager.get<string>(key);

		if (count && parseInt(count) >= this.MAX_REQUESTS_PER_HOUR) {
			throw new HttpException(
				'Trop de demandes de codes de vérification',
				HttpStatus.TOO_MANY_REQUESTS
			);
		}
	}

	private async incrementRateLimit(phoneNumber: string): Promise<void> {
		const key = `rate_limit:${phoneNumber}`;
		let current = (await this.cacheManager.get<number>(key)) || 0;
		current++;

		await this.cacheManager.set(key, current, this.RATE_LIMIT_TTL * 1000);
	}

	async requestRegistrationVerification(dto: VerificationRequestDto): Promise<VerificationRequestResponse> {
		const existingUser = await this.userAuthService.findByPhoneNumber(dto.phoneNumber);
		if (existingUser) {
			throw new ConflictException('An account with this phone number already exists.');
		}
		return this.requestVerification(dto.phoneNumber, 'registration');
	}

	async confirmRegistrationVerification(dto: VerificationConfirmDto): Promise<{ verified: boolean }> {
		const verificationData = await this.verifyCode(dto.verificationId, dto.code);

		// Marquer la vérification comme confirmée dans le cache
		verificationData.verified = true;
		const key = `verification:${dto.verificationId}`;
		await this.cacheManager.set(
			key,
			JSON.stringify(verificationData),
			Math.ceil(verificationData.expiresAt - Date.now())
		);

		return { verified: true };
	}

	async requestLoginVerification(
		dto: VerificationRequestDto
	): Promise<{ verificationId: string; code?: string }> {
		const user = await this.userAuthService.findByPhoneNumber(dto.phoneNumber);
		if (!user) {
			throw new BadRequestException('Aucun compte trouvé avec ce numéro de téléphone');
		}
		return this.requestVerification(dto.phoneNumber, 'login');
	}

	async confirmLoginVerification(
		dto: VerificationConfirmDto
	): Promise<{ verified: boolean; requires2FA: boolean }> {
		const verificationData = await this.verifyCode(dto.verificationId, dto.code);

		// Marquer la vérification comme confirmée dans le cache
		verificationData.verified = true;
		const key = `verification:${dto.verificationId}`;
		await this.cacheManager.set(
			key,
			JSON.stringify(verificationData),
			Math.ceil(verificationData.expiresAt - Date.now())
		);

		const user = await this.userAuthService.findByPhoneNumber(verificationData.phoneNumber);
		if (!user) {
			throw new BadRequestException('Utilisateur non trouvé');
		}
		return {
			verified: true,
			requires2FA: user.twoFactorEnabled,
		};
	}
}
