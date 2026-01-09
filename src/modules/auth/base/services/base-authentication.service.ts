import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { UserAuth } from '../../common/entities/user-auth.entity';
import { UserAuthService } from '../../common/services/user-auth.service';
import { DevicesService } from '../../devices/services/devices.service';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';
import { TokenPair } from '../../tokens/types/token-pair.interface';
import { PhoneVerificationService } from '../../phone-verification/services/phone-verification/phone-verification.service';
import { TokensService } from '../../tokens/services/tokens.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class BaseAuthenticationService {

	constructor(
		private readonly userAuthService: UserAuthService,
		private readonly verificationService: PhoneVerificationService,
		private readonly tokenService: TokensService,
		private readonly deviceService: DevicesService
	) { }

	async register(dto: RegisterDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const verificationData = await this.verificationService.verifyCode(dto.verificationId, '');

		if (verificationData.purpose !== 'registration') {
			throw new BadRequestException("Code de vérification invalide pour l'inscription");
		}

		const existingUser = await this.userAuthService.findByPhoneNumber(verificationData.phoneNumber);
		if (existingUser) {
			throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone');
		}
		const user = this.userAuthService.createUser({
			phoneNumber: verificationData.phoneNumber,
			twoFactorEnabled: false,
			lastAuthenticatedAt: new Date(),
		});
		const savedUser = await this.userAuthService.saveUser(user);

		let deviceId: string;

		if (dto.deviceName && dto.deviceType && dto.publicKey) {
			const device = await this.deviceService.registerDevice({
				userId: savedUser.id,
				deviceName: dto.deviceName,
				deviceType: dto.deviceType,
				publicKey: dto.publicKey,
				ipAddress: fingerprint.ipAddress,
			});
			deviceId = device.id;
		} else {
			deviceId = 'web-session';
		}

		await this.verificationService.consumeVerification(dto.verificationId);

		return this.tokenService.generateTokenPair(savedUser.id, deviceId, fingerprint);
	}

	async login(dto: LoginDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const verificationData = await this.verificationService.verifyCode(dto.verificationId, '');

		if (verificationData.purpose !== 'login') {
			throw new BadRequestException('Code de vérification invalide pour la connexion');
		}

		const user = await this.userAuthService.findByPhoneNumber(verificationData.phoneNumber);
		if (!user) {
			throw new BadRequestException('Utilisateur non trouvé');
		}

		let deviceId: string;
		if (dto.deviceName && dto.deviceType && dto.publicKey) {
			const device = await this.deviceService.registerDevice({
				userId: user.id,
				deviceName: dto.deviceName,
				deviceType: dto.deviceType,
				publicKey: dto.publicKey,
				ipAddress: fingerprint.ipAddress,
			});
			deviceId = device.id;
		} else {
			deviceId = 'web-session';
		}

		user.lastAuthenticatedAt = new Date();

		await this.userAuthService.saveUser(user);

		await this.verificationService.consumeVerification(dto.verificationId);

		return this.tokenService.generateTokenPair(user.id, deviceId, fingerprint);
	}

	async logout(userId: string, deviceId: string): Promise<void> {
		await this.tokenService.revokeAllTokensForDevice(deviceId);

		if (deviceId !== 'web-session') {
			await this.deviceService.updateLastActive(deviceId);
		}
	}
}
