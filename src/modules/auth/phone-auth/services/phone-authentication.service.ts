import { Injectable, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
// UserAuth
import { UserAuthService } from '../../common/services/user-auth.service';
import { UserAuth } from '../../common/entities/user-auth.entity';
// Devices
import { DeviceRegistrationService } from '../../devices/services/device-registration/device-registration.service';
import { DeviceActivityService } from '../../devices/services/device-activity/device-activity.service';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';
// Tokens
import { TokenPair } from '../../tokens/types/token-pair.interface';
import { TokensService } from '../../tokens/services/tokens.service';
// Phone Verification
import { PhoneVerificationService } from '../../phone-verification/services';
// DTOs
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerificationPurpose } from '../../phone-verification/types/verification-purpose.type';
// Interfaces
import { DeviceInfo } from '../interfaces/device-info.interface';
// Events
import { USER_REGISTERED_PATTERN, UserRegisteredEvent } from '../../../shared/events';

@Injectable()
export class PhoneAuthenticationService {

	constructor(
		private readonly deviceRegistrationService: DeviceRegistrationService,
		private readonly deviceActivityService: DeviceActivityService,
		private readonly phoneVerificationService: PhoneVerificationService,
		private readonly tokenService: TokensService,
		private readonly userAuthService: UserAuthService,
		@Inject('REDIS_CLIENT') private readonly redisClient: ClientProxy,
	) { }

	private getWrongPurposeMessage(purpose: VerificationPurpose): string {
		return purpose === 'registration'
			? 'Invalid verification code for registration'
			: 'Invalid verification code for login';
	}

	/**
	 * Verifies the phone verification has been confirmed for a specific purpose
	 * @returns The verified phone number
	 */
	private async verifyPhoneNumberForPurpose(verificationId: string, purpose: VerificationPurpose): Promise<string> {
		const verificationData = await this.phoneVerificationService.getConfirmedVerification(verificationId);

		if (verificationData.purpose !== purpose) {
			const message = this.getWrongPurposeMessage(purpose);
			throw new BadRequestException();
		}

		return verificationData.phoneNumber;
	}

	/**
	 * Registers a device if complete device information is provided, otherwise returns a web session ID
	 * @returns The created device ID if device info is complete, or 'web-session' for web-only authentication
	 */
	private async handleDeviceRegistration(userId: string, deviceInfo: DeviceInfo, fingerprint: DeviceFingerprint): Promise<string> {
		if (deviceInfo.deviceName && deviceInfo.deviceType && deviceInfo.signalKeyBundle) {
			const device = await this.deviceRegistrationService.registerDevice({
				userId,
				deviceName: deviceInfo.deviceName,
				deviceType: deviceInfo.deviceType,
				publicKey: deviceInfo.signalKeyBundle.identityKey,
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
	private async createAuthSession(user: UserAuth, deviceId: string, fingerprint: DeviceFingerprint, verificationId: string): Promise<TokenPair> {
		user.lastAuthenticatedAt = new Date();
		await this.userAuthService.saveUser(user);
		await this.phoneVerificationService.consumeVerification(verificationId);
		return this.tokenService.generateTokenPair(user.id, deviceId, fingerprint);
	}

	/**
	 * Validates that the phone number is verified and available for registration
	 * @returns The verified phone number
	 */
	private async validatePhoneNumberAvailability(verificationId: string): Promise<string> {
		const phoneNumber = await this.verifyPhoneNumberForPurpose(verificationId, 'registration');

		const existingUser = await this.userAuthService.findByPhoneNumber(phoneNumber);
		if (existingUser) {
			throw new ConflictException('An account already exists with this phone number');
		}

		return phoneNumber;
	}

	/**
	 * Creates and saves a new user with the given phone number
	 * @returns The saved user entity
	 */
	private async createAndSaveUser(phoneNumber: string): Promise<UserAuth> {
		const user = this.userAuthService.createUser({
			phoneNumber,
			twoFactorEnabled: false,
			lastAuthenticatedAt: new Date(),
		});

		return this.userAuthService.saveUser(user);
	}

	public async register(dto: RegisterDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const phoneNumber = await this.validatePhoneNumberAvailability(dto.verificationId);
		const savedUser = await this.createAndSaveUser(phoneNumber);
		const deviceId = await this.handleDeviceRegistration(savedUser.id, dto, fingerprint);

		// Emit user.registered event via Redis
		const event: UserRegisteredEvent = {
			userId: savedUser.id,
			phoneNumber: savedUser.phoneNumber,
			timestamp: new Date(),
		};
		this.redisClient.emit(USER_REGISTERED_PATTERN, event);

		return this.createAuthSession(savedUser, deviceId, fingerprint, dto.verificationId);
	}

	public async login(dto: LoginDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const phoneNumber = await this.verifyPhoneNumberForPurpose(dto.verificationId, 'login');

		const user = await this.userAuthService.findByPhoneNumber(phoneNumber);
		if (!user) {
			throw new BadRequestException('User not found');
		}

		const deviceId = await this.handleDeviceRegistration(user.id, dto, fingerprint);

		return this.createAuthSession(user, deviceId, fingerprint, dto.verificationId);
	}

	public async logout(userId: string, deviceId: string): Promise<void> {
		await this.tokenService.revokeAllTokensForDevice(deviceId);

		if (deviceId !== 'web-session') {
			await this.deviceActivityService.updateLastActive(deviceId);
		}
	}
}
