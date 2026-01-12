import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SignalKeysController } from './signal-keys.controller';
import { SignalPreKeyBundleService } from '../services';
import { KeyBundleResponseDto, PreKeyStatusDto } from '../dto';

describe('SignalKeysController', () => {
	let controller: SignalKeysController;
	let prKeyBundleService: jest.Mocked<SignalPreKeyBundleService>;

	const mockUserId = 'test-user-id';
	const mockDeviceId = 'test-device-id';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SignalKeysController],
			providers: [
				{
					provide: SignalPreKeyBundleService,
					useValue: {
						getBundleForUser: jest.fn(),
						getPreKeyStatus: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<SignalKeysController>(SignalKeysController);
		prKeyBundleService = module.get(SignalPreKeyBundleService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getKeyBundle', () => {
		it('should return a key bundle for a user', async () => {
			const mockBundle: KeyBundleResponseDto = {
				userId: mockUserId,
				identityKey: 'identity-key-base64',
				signedPreKey: {
					keyId: 1,
					publicKey: 'signed-prekey-base64',
					signature: 'signature-base64',
				},
				preKey: {
					keyId: 42,
					publicKey: 'prekey-base64',
				},
			};

			prKeyBundleService.getBundleForUser.mockResolvedValue(mockBundle);

			const result = await controller.getKeyBundle(mockUserId);

			expect(result).toEqual(mockBundle);
			expect(prKeyBundleService.getBundleForUser).toHaveBeenCalledWith(mockUserId);
		});

		it('should throw NotFoundException if user has no keys', async () => {
			prKeyBundleService.getBundleForUser.mockRejectedValue(
				new NotFoundException('No keys found'),
			);

			await expect(controller.getKeyBundle(mockUserId)).rejects.toThrow(
				NotFoundException,
			);
		});

		it('should rethrow other errors', async () => {
			const error = new Error('Database error');
			prKeyBundleService.getBundleForUser.mockRejectedValue(error);

			await expect(controller.getKeyBundle(mockUserId)).rejects.toThrow(error);
		});
	});

	describe('getKeyBundleForDevice', () => {
		it('should return a key bundle for a specific device', async () => {
			const mockBundle: KeyBundleResponseDto = {
				userId: mockUserId,
				deviceId: mockDeviceId,
				identityKey: 'identity-key-base64',
				signedPreKey: {
					keyId: 1,
					publicKey: 'signed-prekey-base64',
					signature: 'signature-base64',
				},
			};

			prKeyBundleService.getBundleForUser.mockResolvedValue(mockBundle);

			const result = await controller.getKeyBundleForDevice(
				mockUserId,
				mockDeviceId,
			);

			expect(result).toEqual(mockBundle);
			expect(prKeyBundleService.getBundleForUser).toHaveBeenCalledWith(
				mockUserId,
				mockDeviceId,
			);
		});

		it('should throw NotFoundException if device has no keys', async () => {
			prKeyBundleService.getBundleForUser.mockRejectedValue(
				new NotFoundException('No keys found for device'),
			);

			await expect(
				controller.getKeyBundleForDevice(mockUserId, mockDeviceId),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('getPreKeyStatus', () => {
		it('should return prekey status for a user', async () => {
			const mockStatus: PreKeyStatusDto = {
				userId: mockUserId,
				availablePreKeys: 50,
				isLow: false,
				hasActiveSignedPreKey: true,
				totalPreKeys: 50,
				recommendedUpload: 0,
			};

			prKeyBundleService.getPreKeyStatus.mockResolvedValue(mockStatus);

			const result = await controller.getPreKeyStatus(mockUserId);

			expect(result).toEqual(mockStatus);
			expect(prKeyBundleService.getPreKeyStatus).toHaveBeenCalledWith(mockUserId);
		});

		it('should return status indicating low prekeys', async () => {
			const mockStatus: PreKeyStatusDto = {
				userId: mockUserId,
				availablePreKeys: 10,
				isLow: true,
				hasActiveSignedPreKey: true,
				totalPreKeys: 10,
				recommendedUpload: 90,
			};

			prKeyBundleService.getPreKeyStatus.mockResolvedValue(mockStatus);

			const result = await controller.getPreKeyStatus(mockUserId);

			expect(result.isLow).toBe(true);
			expect(result.recommendedUpload).toBe(90);
		});
	});
});
