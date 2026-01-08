import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserAuthService } from '../../common/services/user-auth.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { BackupCodesService } from '../backup-codes/backup-codes.service';
import { UserAuth } from '../../common/entities/user-auth.entity';

interface TwoFactorSetup {
	secret: string;
	qrCodeUrl: string;
	backupCodes: string[];
}

@Injectable()
export class TwoFactorAuthenticationService {
	constructor(
		private readonly userAuthService: UserAuthService,
		private readonly backupCodesService: BackupCodesService
	) {}

	async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
		const user = await this.userAuthService.findById(userId);

		if (!user) {
			throw new BadRequestException('Utilisateur non trouvé');
		}

		if (user.twoFactorEnabled) {
			throw new BadRequestException("L'authentification à deux facteurs est déjà activée");
		}

		const secret = speakeasy.generateSecret({
			name: `Whispr (${user.phoneNumber})`,
			issuer: 'Whispr',
			length: 32,
		});

		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
		const backupCodes = await this.backupCodesService.generateBackupCodes(userId);

		return {
			secret: secret.base32,
			qrCodeUrl,
			backupCodes,
		};
	}

	async enableTwoFactor(userId: string, secret: string, token: string): Promise<void> {
		const user = await this.userAuthService.findById(userId);
		if (!user) {
			throw new BadRequestException('Utilisateur non trouvé');
		}

		const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });

		if (!isValid) {
			throw new BadRequestException('Code de vérification invalide');
		}

		user.twoFactorSecret = secret;
		user.twoFactorEnabled = true;

		await this.userAuthService.saveUser(user);
	}

	async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
		const user = await this.userAuthService.findById(userId);

		if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
			throw new BadRequestException('Authentification à deux facteurs non configurée');
		}

		const isValidTOTP = speakeasy.totp.verify({
			secret: user.twoFactorSecret,
			encoding: 'base32',
			token,
			window: 2,
		});

		if (isValidTOTP) {
			return true;
		}

		// Check backup codes if TOTP fails
		const isValidBackupCode = await this.backupCodesService.verifyBackupCode(userId, token);
		return isValidBackupCode;
	}

	async disableTwoFactor(userId: string, token: string): Promise<void> {
		const user = await this.userAuthService.findById(userId);

		if (!user) {
			throw new BadRequestException('Utilisateur non trouvé');
		}

		if (!user.twoFactorEnabled) {
			throw new BadRequestException("L'authentification à deux facteurs n'est pas activée");
		}

		const isValid = await this.verifyTwoFactor(userId, token);

		if (!isValid) {
			throw new UnauthorizedException('Code de vérification invalide');
		}

		user.twoFactorSecret = '';
		user.twoFactorEnabled = false;

		// Delete all backup codes when disabling 2FA
		await this.backupCodesService.deleteAllBackupCodes(userId);
		await this.userAuthService.saveUser(user);
	}

	async generateNewBackupCodes(userId: string, token: string): Promise<string[]> {
		const user = await this.userAuthService.findById(userId);

		if (!user || !user.twoFactorEnabled) {
			throw new BadRequestException('Authentification à deux facteurs non configurée');
		}

		const isValid = await this.verifyTwoFactor(userId, token);

		if (!isValid) {
			throw new UnauthorizedException('Code de vérification invalide');
		}

		const backupCodes = await this.backupCodesService.generateBackupCodes(userId);
		return backupCodes;
	}

	async isTwoFactorEnabled(userId: string): Promise<boolean> {
		const user = await this.userAuthService.findById(userId);
		return user?.twoFactorEnabled || false;
	}
}
