import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SignalKeyValidationService } from './signal-key-validation.service';
import { SignedPreKeyRepository } from '../repositories';
import { SignedPreKeyDto, PreKeyDto } from '../dto';

describe('SignalKeyValidationService', () => {
	let service: SignalKeyValidationService;
	let signedPreKeyRepo: jest.Mocked<SignedPreKeyRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignalKeyValidationService,
				{
					provide: SignedPreKeyRepository,
					useValue: {
						findByUserIdAndKeyId: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<SignalKeyValidationService>(SignalKeyValidationService);
		signedPreKeyRepo = module.get(SignedPreKeyRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('validatePublicKeyFormat', () => {
		it('should accept valid base64 keys', () => {
			const validKey = 'BRjK5ghi789abcdefGHIJKLMNOP==';

			expect(() => service.validatePublicKeyFormat(validKey)).not.toThrow();
		});

		it('should reject empty keys', () => {
			expect(() => service.validatePublicKeyFormat('')).toThrow(
				BadRequestException,
			);
		});

		it('should reject non-string keys', () => {
			expect(() => service.validatePublicKeyFormat(null as any)).toThrow(
				BadRequestException,
			);
		});

		it('should reject keys with invalid base64 characters', () => {
			expect(() => service.validatePublicKeyFormat('invalid@key!')).toThrow(
				BadRequestException,
			);
		});

		it('should reject keys that are too short', () => {
			expect(() => service.validatePublicKeyFormat('ABC')).toThrow(
				BadRequestException,
			);
		});

		it('should reject keys that are too long', () => {
			const tooLong = 'A'.repeat(150);
			expect(() => service.validatePublicKeyFormat(tooLong)).toThrow(
				BadRequestException,
			);
		});
	});

	describe('validateSignedPreKey', () => {
		it('should accept valid signed prekey', () => {
			const validKey: SignedPreKeyDto = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'SGVsbG8xyz789validbase64sig==',
			};

			expect(() => service.validateSignedPreKey(validKey)).not.toThrow();
		});

		it('should reject null signed prekey', () => {
			expect(() => service.validateSignedPreKey(null as any)).toThrow(
				BadRequestException,
			);
		});

		it('should reject negative keyId', () => {
			const invalidKey: SignedPreKeyDto = {
				keyId: -1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'SGVsbG8xyz789validbase64sig==',
			};

			expect(() => service.validateSignedPreKey(invalidKey)).toThrow(
				BadRequestException,
			);
		});

		it('should reject missing signature', () => {
			const invalidKey: any = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
			};

			expect(() => service.validateSignedPreKey(invalidKey)).toThrow(
				BadRequestException,
			);
		});

		it('should reject invalid signature format', () => {
			const invalidKey: SignedPreKeyDto = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'invalid@signature!',
			};

			expect(() => service.validateSignedPreKey(invalidKey)).toThrow(
				BadRequestException,
			);
		});
	});

	describe('validatePreKey', () => {
		it('should accept valid prekey', () => {
			const validKey: PreKeyDto = {
				keyId: 42,
				publicKey: 'BZrt9def456validbase64encoded=',
			};

			expect(() => service.validatePreKey(validKey)).not.toThrow();
		});

		it('should reject null prekey', () => {
			expect(() => service.validatePreKey(null as any)).toThrow(
				BadRequestException,
			);
		});

		it('should reject negative keyId', () => {
			const invalidKey: PreKeyDto = {
				keyId: -5,
				publicKey: 'BZrt9def456validbase64encoded=',
			};

			expect(() => service.validatePreKey(invalidKey)).toThrow(
				BadRequestException,
			);
		});
	});

	describe('validatePreKeys', () => {
		it('should accept valid array of prekeys', () => {
			const validKeys: PreKeyDto[] = [
				{ keyId: 1, publicKey: 'BZrt9def456validbase64encoded=' },
				{ keyId: 2, publicKey: 'BXmn4ghi789validbase64encoded=' },
			];

			expect(() => service.validatePreKeys(validKeys)).not.toThrow();
		});

		it('should reject non-array input', () => {
			expect(() => service.validatePreKeys(null as any)).toThrow(
				BadRequestException,
			);
		});

		it('should reject empty array', () => {
			expect(() => service.validatePreKeys([])).toThrow(BadRequestException);
		});

		it('should reject array with too many keys', () => {
			const tooManyKeys = Array.from({ length: 201 }, (_, i) => ({
				keyId: i,
				publicKey: 'BZrt9def456validbase64encoded=',
			}));

			expect(() => service.validatePreKeys(tooManyKeys)).toThrow(
				BadRequestException,
			);
		});

		it('should reject array with duplicate keyIds', () => {
			const duplicateKeys: PreKeyDto[] = [
				{ keyId: 1, publicKey: 'BZrt9def456validbase64encoded=' },
				{ keyId: 1, publicKey: 'BXmn4ghi789validbase64encoded=' },
			];

			expect(() => service.validatePreKeys(duplicateKeys)).toThrow(
				BadRequestException,
			);
		});
	});

	describe('isSignedPreKeyIdUnique', () => {
		it('should return true if keyId is unique', async () => {
			signedPreKeyRepo.findByUserIdAndKeyId.mockResolvedValue(null);

			const result = await service.isSignedPreKeyIdUnique('user-id', 1);

			expect(result).toBe(true);
		});

		it('should return false if keyId already exists', async () => {
			signedPreKeyRepo.findByUserIdAndKeyId.mockResolvedValue({} as any);

			const result = await service.isSignedPreKeyIdUnique('user-id', 1);

			expect(result).toBe(false);
		});
	});

	describe('validateSignedPreKeyIdUniqueness', () => {
		it('should not throw if keyId is unique', async () => {
			signedPreKeyRepo.findByUserIdAndKeyId.mockResolvedValue(null);

			await expect(
				service.validateSignedPreKeyIdUniqueness('user-id', 1),
			).resolves.not.toThrow();
		});

		it('should throw if keyId already exists', async () => {
			signedPreKeyRepo.findByUserIdAndKeyId.mockResolvedValue({} as any);

			await expect(
				service.validateSignedPreKeyIdUniqueness('user-id', 1),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe('validateIdentityKey', () => {
		it('should accept valid identity key', () => {
			const validKey = 'BRjK5ghi789validbase64encoded=';

			expect(() => service.validateIdentityKey(validKey)).not.toThrow();
		});

		it('should reject null identity key', () => {
			expect(() => service.validateIdentityKey(null as any)).toThrow(
				BadRequestException,
			);
		});

		it('should reject empty identity key', () => {
			expect(() => service.validateIdentityKey('')).toThrow(
				BadRequestException,
			);
		});
	});

	describe('validateKeyBundle', () => {
		it('should accept complete valid key bundle', () => {
			const identityKey = 'BRjK5ghi789validbase64encoded=';
			const signedPreKey: SignedPreKeyDto = {
				keyId: 1,
				publicKey: 'BQXm8abc123validbase64encoded=',
				signature: 'SGVsbG8xyz789validbase64sig==',
			};
			const preKeys: PreKeyDto[] = [
				{ keyId: 1, publicKey: 'BZrt9def456validbase64encoded=' },
			];

			expect(() =>
				service.validateKeyBundle(identityKey, signedPreKey, preKeys),
			).not.toThrow();
		});
	});

	describe('isSignedPreKeyExpired', () => {
		it('should return true for expired key', () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

			const result = service.isSignedPreKeyExpired(pastDate);

			expect(result).toBe(true);
		});

		it('should return false for future key', () => {
			const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

			const result = service.isSignedPreKeyExpired(futureDate);

			expect(result).toBe(false);
		});
	});
});
