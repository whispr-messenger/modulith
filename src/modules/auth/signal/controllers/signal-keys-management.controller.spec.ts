import { Test, TestingModule } from '@nestjs/testing';
import { SignalKeysManagementController } from './signal-keys-management.controller';
import { SignalKeyRotationService } from '../services/signal-key-rotation.service';
import { SignalKeyValidationService } from '../services/signal-key-validation.service';
import { SignalKeyStorageService } from '../services/signal-key-storage.service';
import { SignedPreKeyDto, PreKeyDto } from '../dto';
import { BadRequestException } from '@nestjs/common';

describe('SignalKeysManagementController', () => {
	let controller: SignalKeysManagementController;
	let rotationService: jest.Mocked<SignalKeyRotationService>;
	let validationService: jest.Mocked<SignalKeyValidationService>;
	let storageService: jest.Mocked<SignalKeyStorageService>;

	const mockUserId = 'test-user-id';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SignalKeysManagementController],
			providers: [
				{
					provide: SignalKeyRotationService,
					useValue: {
						rotateSignedPreKey: jest.fn(),
						replenishPreKeys: jest.fn(),
						getRotationRecommendations: jest.fn(),
					},
				},
				{
					provide: SignalKeyValidationService,
					useValue: {
						validateSignedPreKey: jest.fn(),
						validateSignedPreKeyIdUniqueness: jest.fn(),
						validatePreKeys: jest.fn(),
					},
				},
				{
					provide: SignalKeyStorageService,
					useValue: {
						deleteDeviceKeys: jest.fn(),
						deleteUserKeys: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<SignalKeysManagementController>(
			SignalKeysManagementController,
		);
		rotationService = module.get(SignalKeyRotationService);
		validationService = module.get(SignalKeyValidationService);
		storageService = module.get(SignalKeyStorageService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('uploadSignedPreKey', () => {
		it('should upload new signed prekey', async () => {
			const newSignedPreKey: SignedPreKeyDto = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'SGVsbG8xyz789validbase64sig==',
			};

			validationService.validateSignedPreKey.mockReturnValue(undefined);
			validationService.validateSignedPreKeyIdUniqueness.mockResolvedValue(
				undefined,
			);
			rotationService.rotateSignedPreKey.mockResolvedValue(undefined);

			const result = await controller.uploadSignedPreKey(
				mockUserId,
				newSignedPreKey,
			);

			expect(result).toEqual({
				message: 'SignedPreKey uploaded successfully',
			});
			expect(validationService.validateSignedPreKey).toHaveBeenCalledWith(
				newSignedPreKey,
			);
			expect(
				validationService.validateSignedPreKeyIdUniqueness,
			).toHaveBeenCalledWith(mockUserId, newSignedPreKey.keyId);
			expect(rotationService.rotateSignedPreKey).toHaveBeenCalledWith(
				mockUserId,
				newSignedPreKey,
			);
		});

		it('should throw if validation fails', async () => {
			const invalidKey: SignedPreKeyDto = {
				keyId: -1,
				publicKey: 'invalid',
				signature: 'invalid',
			};

			validationService.validateSignedPreKey.mockImplementation(() => {
				throw new BadRequestException('Invalid key');
			});

			await expect(
				controller.uploadSignedPreKey(mockUserId, invalidKey),
			).rejects.toThrow(BadRequestException);
		});

		it('should throw if keyId is not unique', async () => {
			const duplicateKey: SignedPreKeyDto = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'SGVsbG8xyz789validbase64sig==',
			};

			validationService.validateSignedPreKey.mockReturnValue(undefined);
			validationService.validateSignedPreKeyIdUniqueness.mockRejectedValue(
				new BadRequestException('KeyId already exists'),
			);

			await expect(
				controller.uploadSignedPreKey(mockUserId, duplicateKey),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe('uploadPreKeys', () => {
		it('should upload new prekeys', async () => {
			const newPreKeys: PreKeyDto[] = [
				{ keyId: 1, publicKey: 'BZrt9def456validbase64encoded=' },
				{ keyId: 2, publicKey: 'BXmn4ghi789validbase64encoded=' },
			];

			validationService.validatePreKeys.mockReturnValue(undefined);
			rotationService.replenishPreKeys.mockResolvedValue(undefined);

			const result = await controller.uploadPreKeys(mockUserId, {
				preKeys: newPreKeys,
			});

			expect(result).toEqual({
				message: 'PreKeys uploaded successfully',
				count: 2,
			});
			expect(validationService.validatePreKeys).toHaveBeenCalledWith(newPreKeys);
			expect(rotationService.replenishPreKeys).toHaveBeenCalledWith(
				mockUserId,
				newPreKeys,
			);
		});

		it('should throw if validation fails', async () => {
			const invalidKeys: PreKeyDto[] = [];

			validationService.validatePreKeys.mockImplementation(() => {
				throw new BadRequestException('Empty array');
			});

			await expect(
				controller.uploadPreKeys(mockUserId, { preKeys: invalidKeys }),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe('getRotationRecommendations', () => {
		it('should return rotation recommendations', async () => {
			const mockRecommendations = {
				needsPreKeyReplenishment: true,
				needsSignedPreKeyRotation: false,
				availablePreKeys: 10,
				recommendedPreKeyUpload: 90,
				signedPreKeyExpiresAt: new Date(),
			};

			rotationService.getRotationRecommendations.mockResolvedValue(
				mockRecommendations,
			);

			const result =
				await controller.getRotationRecommendations(mockUserId);

			expect(result).toEqual(mockRecommendations);
			expect(rotationService.getRotationRecommendations).toHaveBeenCalledWith(
				mockUserId,
			);
		});
	});

	describe('deleteDeviceKeys', () => {
		it('should delete keys for a device', async () => {
			const deviceId = 'test-device-id';
			storageService.deleteDeviceKeys.mockResolvedValue(undefined);

			const result = await controller.deleteDeviceKeys(mockUserId, deviceId);

			expect(result).toEqual({
				message: 'Device keys deleted successfully',
			});
			expect(storageService.deleteDeviceKeys).toHaveBeenCalledWith(
				mockUserId,
				deviceId,
			);
		});
	});

	describe('deleteUserKeys', () => {
		it('should delete all keys for a user', async () => {
			storageService.deleteUserKeys.mockResolvedValue(undefined);

			const result = await controller.deleteUserKeys(mockUserId);

			expect(result).toEqual({
				message: 'All user keys deleted successfully',
			});
			expect(storageService.deleteUserKeys).toHaveBeenCalledWith(mockUserId);
		});
	});
});
