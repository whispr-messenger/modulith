import {
	BadRequestException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { QRChallengeData } from './quick-response-challenge-data.interface';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { ScanLoginDto } from '../dto/scan-login.dto';
import { DeviceFingerprint } from '../types/device-fingerprint.interface';
import { TokenPair } from '../../tokens/types/token-pair.interface';
import { DevicesService } from '../services/devices.service';
import { TokensService } from '../../tokens/services/tokens.service';
import { UserAuth } from '../../common/entities/user-auth.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class QuickResponseCodeService {
	private readonly QR_CHALLENGE_TTL = 5 * 60;

	constructor(
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		private readonly jwtService: JwtService,
		private readonly deviceService: DevicesService,
		private readonly tokenService: TokensService,
		@InjectRepository(Device)
		private readonly deviceRepository: Repository<Device>,
		@InjectRepository(UserAuth)
		private readonly userAuthRepository: Repository<UserAuth>
	) { }

	async getDevice(deviceId: string): Promise<Device> {
		const device = await this.deviceRepository.findOne({
			where: { id: deviceId },
		});
		if (!device) {
			throw new NotFoundException('Appareil non trouvé');
		}
		return device;
	}

	async generateQRChallenge(authenticatedDeviceId: string): Promise<string> {
		const device = await this.getDevice(authenticatedDeviceId);

		const challengeId = uuidv4();
		const challengeData: QRChallengeData = {
			userId: device.userId,
			deviceId: device.id,
			publicKey: device.publicKey,
			expiresAt: Date.now() + this.QR_CHALLENGE_TTL * 1000,
		};

		const challenge = this.jwtService.sign(
			{
				challengeId,
				deviceId: device.id,
				userId: device.userId,
				exp: Math.floor(challengeData.expiresAt / 1000),
			},
			{ algorithm: 'ES256' }
		);

		await this.cacheManager.set(
			`qr_challenge:${challengeId}`,
			JSON.stringify(challengeData),
			this.QR_CHALLENGE_TTL * 1000
		);

		return challenge;
	}

	async scanLogin(dto: ScanLoginDto, fingerprint: DeviceFingerprint): Promise<TokenPair> {
		const challengeData = await this.validateQRChallenge(dto.challenge, dto.authenticatedDeviceId);

		let deviceId: string;
		if (dto.deviceName && dto.deviceType) {
			const device = await this.deviceService.registerDevice({
				userId: challengeData.userId,
				deviceName: dto.deviceName,
				deviceType: dto.deviceType,
				publicKey: challengeData.publicKey,
				ipAddress: fingerprint.ipAddress,
			});
			deviceId = device.id;
		} else {
			deviceId = 'web-session';
		}

		const user = await this.userAuthRepository.findOne({
			where: { id: challengeData.userId },
		});

		if (user) {
			user.lastAuthenticatedAt = new Date();
			await this.userAuthRepository.save(user);
		}

		return this.tokenService.generateTokenPair(challengeData.userId, deviceId, fingerprint);
	}

	async validateQRChallenge(challenge: string, authenticatedDeviceId: string): Promise<QRChallengeData> {
		try {
			const decoded = this.jwtService.verify(challenge, {
				algorithms: ['ES256'],
			});

			if (decoded.deviceId !== authenticatedDeviceId) {
				throw new ForbiddenException('Appareil non autorisé pour ce challenge');
			}

			const challengeData = await this.cacheManager.get<string>(`qr_challenge:${decoded.challengeId}`);
			if (!challengeData) {
				throw new BadRequestException('Challenge QR expiré ou invalide');
			}

			const data: QRChallengeData = JSON.parse(challengeData);

			if (data.expiresAt < Date.now()) {
				await this.cacheManager.del(`qr_challenge:${decoded.challengeId}`);
				throw new BadRequestException('Challenge QR expiré');
			}

			await this.cacheManager.del(`qr_challenge:${decoded.challengeId}`);

			return data;
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new BadRequestException('Challenge QR invalide');
		}
	}
}
