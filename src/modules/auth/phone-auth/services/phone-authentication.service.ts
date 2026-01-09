import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { UserAuthService } from '../../common/services/user-auth.service';
import { UserAuth } from '../../common/entities/user-auth.entity';
import { DeviceRegistrationService } from '../../devices/services/device-registration.service';
import { DeviceActivityService } from '../../devices/services/device-activity.service';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';
import { TokenPair } from '../../tokens/types/token-pair.interface';
import { PhoneVerificationService } from '../../phone-verification/services/phone-verification/phone-verification.service';
import { TokensService } from '../../tokens/services/tokens.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class PhoneAuthenticationService {

	constructor(
		private readonly deviceRegistrationService: DeviceRegistrationService,
		private readonly deviceActivityService: DeviceActivityService,
		private readonly phoneVerificationService: PhoneVerificationService,
		private readonly tokenService: TokensService,
		private readonly userAuthService: UserAuthService,
	) { }

	/**
	 * Verifies the phone verification has been confirmed for a specific purpose
	 * @returns The verified phone number
	 */
	private async verifyPhoneNumberForPurpose(
		verificationId: string,
		purpose: 'registration' | 'login'
	): Promise<string> {
		const verificationData = await this.phoneVerificationService.getConfirmedVerification(verificationId);

		if (verificationData.purpose !== purpose) {
			const message = purpose === 'registration'
				? 'Invalid verification code for registration'
				: 'Invalid verification code for login';
			throw new BadRequestException(message);
		}

		return verificationData.phoneNumber;
	}

	/**
	 * Handles device registration or returns a web session ID
	 * @returns The created device ID or 'web-session'
	 */
	private async handleDeviceRegistration(
		userId: string,
		dto: { deviceName?: string; deviceType?: string; publicKey?: string },
		fingerprint: DeviceFingerprint
	): Promise<string> {
		if (dto.deviceName && dto.deviceType && dto.publicKey) {
			const device = await this.deviceRegistrationService.registerDevice({
				userId,
				deviceName: dto.deviceName,
				deviceType: dto.deviceType,
				publicKey: dto.publicKey,
				ipAddress: fingerprint.ipAddress,
			});
			return device.id;
		}
		return 'web-session';
	}

	/**
	 * Finalizes the authentication session by updating the user,
	 * consuming the verification and generating tokens
	 */
	private async createAuthSession(
		user: UserAuth,
		deviceId: string,
		fingerprint: DeviceFingerprint,
		verificationId: string
	): Promise<TokenPair> {
		user.lastAuthenticatedAt = new Date();
		await this.userAuthService.saveUser(user);
		await this.phoneVerificationService.consumeVerification(verificationId);
		return this.tokenService.generateTokenPair(user.id, deviceId, fingerprint);
	}

	async register(dto: RegisterDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const phoneNumber = await this.verifyPhoneNumberForPurpose(dto.verificationId, 'registration');

		const existingUser = await this.userAuthService.findByPhoneNumber(phoneNumber);
		if (existingUser) {
			throw new ConflictException('An account already exists with this phone number');
		}

		const user = this.userAuthService.createUser({
			phoneNumber,
			twoFactorEnabled: false,
			lastAuthenticatedAt: new Date(),
		});
		const savedUser = await this.userAuthService.saveUser(user);

		const deviceId = await this.handleDeviceRegistration(savedUser.id, dto, fingerprint);

		return this.createAuthSession(savedUser, deviceId, fingerprint, dto.verificationId);
	}

	async login(dto: LoginDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const phoneNumber = await this.verifyPhoneNumberForPurpose(dto.verificationId, 'login');

		const user = await this.userAuthService.findByPhoneNumber(phoneNumber);
		if (!user) {
			throw new BadRequestException('User not found');
		}

		const deviceId = await this.handleDeviceRegistration(user.id, dto, fingerprint);

		return this.createAuthSession(user, deviceId, fingerprint, dto.verificationId);
	}

	async logout(userId: string, deviceId: string): Promise<void> {
		await this.tokenService.revokeAllTokensForDevice(deviceId);

		if (deviceId !== 'web-session') {
			await this.deviceActivityService.updateLastActive(deviceId);
		}
	}
}
