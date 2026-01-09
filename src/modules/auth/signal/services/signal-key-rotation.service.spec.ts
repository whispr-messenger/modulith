import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SignalKeyRotationService } from './signal-key-rotation.service';
import { SignalKeyStorageService } from './signal-key-storage.service';
import { SignedPreKeyRepository } from '../repositories';
import { SignedPreKeyDto, PreKeyDto } from '../dto';
import { SignedPreKey } from '../entities';

describe('SignalKeyRotationService', () => {
	let service: SignalKeyRotationService;
	let keyStorage: jest.Mocked<SignalKeyStorageService>;
	let signedPreKeyRepo: jest.Mocked<SignedPreKeyRepository>;

	const mockUserId = 'test-user-id';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignalKeyRotationService,
				{
					provide: SignalKeyStorageService,
					useValue: {
						storeSignedPreKey: jest.fn(),
						storePreKeys: jest.fn(),
						getUnusedPreKeyCount: jest.fn(),
						getActiveSignedPreKey: jest.fn(),
					},
				},
				{
					provide: SignedPreKeyRepository,
					useValue: {
						findExpired: jest.fn(),
						delete: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<SignalKeyRotationService>(SignalKeyRotationService);
		keyStorage = module.get(SignalKeyStorageService);
		signedPreKeyRepo = module.get(SignedPreKeyRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('rotateSignedPreKey', () => {
		it('should rotate a signed prekey', async () => {
			const newSignedPreKey: SignedPreKeyDto = {
				keyId: 2,
				publicKey: 'new-signed-prekey',
				signature: 'new-signature',
			};

			keyStorage.storeSignedPreKey.mockResolvedValue(undefined as any);

			await service.rotateSignedPreKey(mockUserId, newSignedPreKey);

			expect(keyStorage.storeSignedPreKey).toHaveBeenCalledWith(
				mockUserId,
				newSignedPreKey,
			);
		});

		it('should throw error if storage fails', async () => {
			const newSignedPreKey: SignedPreKeyDto = {
				keyId: 2,
				publicKey: 'new-signed-prekey',
				signature: 'new-signature',
			};

			keyStorage.storeSignedPreKey.mockRejectedValue(new Error('Storage error'));

			await expect(
				service.rotateSignedPreKey(mockUserId, newSignedPreKey),
			).rejects.toThrow('Storage error');
		});
	});

	describe('replenishPreKeys', () => {
		it('should replenish prekeys', async () => {
			const newPreKeys: PreKeyDto[] = [
				{ keyId: 1, publicKey: 'pk1' },
				{ keyId: 2, publicKey: 'pk2' },
			];

			keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);
			keyStorage.storePreKeys.mockResolvedValue(undefined as any);

			await service.replenishPreKeys(mockUserId, newPreKeys);

			expect(keyStorage.storePreKeys).toHaveBeenCalledWith(mockUserId, newPreKeys);
		});

		it('should throw error if total exceeds maximum', async () => {
			const newPreKeys: PreKeyDto[] = Array.from({ length: 100 }, (_, i) => ({
				keyId: i,
				publicKey: `pk${i}`,
			}));

			keyStorage.getUnusedPreKeyCount.mockResolvedValue(150);

			await expect(
				service.replenishPreKeys(mockUserId, newPreKeys),
			).rejects.toThrow(BadRequestException);
		});

		it('should allow replenishment if within limits', async () => {
			const newPreKeys: PreKeyDto[] = Array.from({ length: 50 }, (_, i) => ({
				keyId: i,
				publicKey: `pk${i}`,
			}));

			keyStorage.getUnusedPreKeyCount.mockResolvedValue(100);
			keyStorage.storePreKeys.mockResolvedValue(undefined as any);

			await service.replenishPreKeys(mockUserId, newPreKeys);

			expect(keyStorage.storePreKeys).toHaveBeenCalled();
		});
	});

	describe('checkLowPreKeys', () => {
		it('should return true if prekeys are low', async () => {
			keyStorage.getUnusedPreKeyCount.mockResolvedValue(10);

			const result = await service.checkLowPreKeys(mockUserId);

			expect(result).toBe(true);
		});

		it('should return false if prekeys are sufficient', async () => {
			keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);

			const result = await service.checkLowPreKeys(mockUserId);

			expect(result).toBe(false);
		});

		it('should return true if exactly at threshold', async () => {
			keyStorage.getUnusedPreKeyCount.mockResolvedValue(19);

			const result = await service.checkLowPreKeys(mockUserId);

			expect(result).toBe(true);
		});
	});

	describe('needsSignedPreKeyRotation', () => {
		it('should return true if no active signed prekey', async () => {
			keyStorage.getActiveSignedPreKey.mockResolvedValue(null);

			const result = await service.needsSignedPreKeyRotation(mockUserId);

			expect(result).toBe(true);
		});

		it('should return true if signed prekey expires within 24 hours', async () => {
			const expiringKey: Partial<SignedPreKey> = {
				expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
			};

			keyStorage.getActiveSignedPreKey.mockResolvedValue(
				expiringKey as SignedPreKey,
			);

			const result = await service.needsSignedPreKeyRotation(mockUserId);

			expect(result).toBe(true);
		});

		it('should return false if signed prekey is fresh', async () => {
			const freshKey: Partial<SignedPreKey> = {
				expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
			};

			keyStorage.getActiveSignedPreKey.mockResolvedValue(
				freshKey as SignedPreKey,
			);

			const result = await service.needsSignedPreKeyRotation(mockUserId);

			expect(result).toBe(false);
		});
	});

	describe('getRotationRecommendations', () => {
		it('should return complete recommendations', async () => {
			const mockSignedPreKey: Partial<SignedPreKey> = {
				expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
			};

			keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);
			keyStorage.getActiveSignedPreKey.mockResolvedValue(
				mockSignedPreKey as SignedPreKey,
			);

			const result = await service.getRotationRecommendations(mockUserId);

			expect(result).toEqual({
				needsPreKeyReplenishment: false,
				needsSignedPreKeyRotation: false,
				availablePreKeys: 50,
				recommendedPreKeyUpload: 0,
				signedPreKeyExpiresAt: mockSignedPreKey.expiresAt,
			});
		});

		it('should recommend replenishment when prekeys are low', async () => {
			const mockSignedPreKey: Partial<SignedPreKey> = {
				expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
			};

			keyStorage.getUnusedPreKeyCount.mockResolvedValue(10);
			keyStorage.getActiveSignedPreKey.mockResolvedValue(
				mockSignedPreKey as SignedPreKey,
			);

			const result = await service.getRotationRecommendations(mockUserId);

			expect(result.needsPreKeyReplenishment).toBe(true);
			expect(result.recommendedPreKeyUpload).toBe(90);
		});
	});

	describe('cleanupExpiredSignedPreKeys', () => {
		it('should delete expired keys beyond grace period', async () => {
			const oldExpiredKey: Partial<SignedPreKey> = {
				id: 'old-key',
				expiresAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
			};

			const recentExpiredKey: Partial<SignedPreKey> = {
				id: 'recent-key',
				expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
			};

			signedPreKeyRepo.findExpired.mockResolvedValue([
				oldExpiredKey,
				recentExpiredKey,
			] as SignedPreKey[]);
			signedPreKeyRepo.delete.mockResolvedValue(undefined as any);

			const result = await service.cleanupExpiredSignedPreKeys(30);

			expect(result).toBe(1); // Only old key deleted
			expect(signedPreKeyRepo.delete).toHaveBeenCalledWith('old-key');
			expect(signedPreKeyRepo.delete).not.toHaveBeenCalledWith('recent-key');
		});

		it('should handle empty expired keys list', async () => {
			signedPreKeyRepo.findExpired.mockResolvedValue([]);

			const result = await service.cleanupExpiredSignedPreKeys();

			expect(result).toBe(0);
			expect(signedPreKeyRepo.delete).not.toHaveBeenCalled();
		});
	});
});
