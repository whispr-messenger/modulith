import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SignalPreKeyBundleService } from './signal-prekey-bundle.service';
import { SignalKeyStorageService } from './signal-key-storage.service';
import { IdentityKey } from '../entities/identity-key.entity';
import { SignedPreKey } from '../entities/signed-prekey.entity';
import { PreKey } from '../entities/prekey.entity';

describe('SignalPreKeyBundleService', () => {
    let service: SignalPreKeyBundleService;
    let keyStorage: jest.Mocked<SignalKeyStorageService>;

    const mockUserId = 'test-user-id';
    const mockDeviceId = 'test-device-id';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SignalPreKeyBundleService,
                {
                    provide: SignalKeyStorageService,
                    useValue: {
                        getIdentityKey: jest.fn(),
                        getActiveSignedPreKey: jest.fn(),
                        getUnusedPreKey: jest.fn(),
                        markPreKeyAsUsed: jest.fn(),
                        getUnusedPreKeyCount: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SignalPreKeyBundleService>(SignalPreKeyBundleService);
        keyStorage = module.get(SignalKeyStorageService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getBundleForUser', () => {
        it('should return a complete key bundle with prekey', async () => {
            const mockIdentityKey: Partial<IdentityKey> = {
                id: 'ik-id',
                userId: mockUserId,
                publicKey: 'identity-key-base64',
            };

            const mockSignedPreKey: Partial<SignedPreKey> = {
                id: 'spk-id',
                userId: mockUserId,
                keyId: 1,
                publicKey: 'signed-prekey-base64',
                signature: 'signature-base64',
            };

            const mockPreKey: Partial<PreKey> = {
                id: 'pk-id',
                userId: mockUserId,
                keyId: 42,
                publicKey: 'prekey-base64',
                isUsed: false,
            };

            keyStorage.getIdentityKey.mockResolvedValue(mockIdentityKey as IdentityKey);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );
            keyStorage.getUnusedPreKey.mockResolvedValue(mockPreKey as PreKey);
            keyStorage.markPreKeyAsUsed.mockResolvedValue(undefined);

            const result = await service.getBundleForUser(mockUserId);

            expect(result).toEqual({
                userId: mockUserId,
                deviceId: undefined,
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
            });

            expect(keyStorage.markPreKeyAsUsed).toHaveBeenCalledWith('pk-id');
        });

        it('should return a bundle without prekey if none available', async () => {
            const mockIdentityKey: Partial<IdentityKey> = {
                id: 'ik-id',
                userId: mockUserId,
                publicKey: 'identity-key-base64',
            };

            const mockSignedPreKey: Partial<SignedPreKey> = {
                id: 'spk-id',
                userId: mockUserId,
                keyId: 1,
                publicKey: 'signed-prekey-base64',
                signature: 'signature-base64',
            };

            keyStorage.getIdentityKey.mockResolvedValue(mockIdentityKey as IdentityKey);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );
            keyStorage.getUnusedPreKey.mockResolvedValue(null);

            const result = await service.getBundleForUser(mockUserId);

            expect(result).toEqual({
                userId: mockUserId,
                deviceId: undefined,
                identityKey: 'identity-key-base64',
                signedPreKey: {
                    keyId: 1,
                    publicKey: 'signed-prekey-base64',
                    signature: 'signature-base64',
                },
            });

            expect(result.preKey).toBeUndefined();
            expect(keyStorage.markPreKeyAsUsed).not.toHaveBeenCalled();
        });

        it('should include deviceId when provided', async () => {
            const mockIdentityKey: Partial<IdentityKey> = {
                id: 'ik-id',
                userId: mockUserId,
                publicKey: 'identity-key-base64',
            };

            const mockSignedPreKey: Partial<SignedPreKey> = {
                id: 'spk-id',
                userId: mockUserId,
                keyId: 1,
                publicKey: 'signed-prekey-base64',
                signature: 'signature-base64',
            };

            keyStorage.getIdentityKey.mockResolvedValue(mockIdentityKey as IdentityKey);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );
            keyStorage.getUnusedPreKey.mockResolvedValue(null);

            const result = await service.getBundleForUser(mockUserId, mockDeviceId);

            expect(result.deviceId).toBe(mockDeviceId);
        });

        it('should throw NotFoundException if no identity key exists', async () => {
            keyStorage.getIdentityKey.mockResolvedValue(null);

            await expect(service.getBundleForUser(mockUserId)).rejects.toThrow(
                NotFoundException,
            );

            expect(keyStorage.getActiveSignedPreKey).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if no active signed prekey exists', async () => {
            const mockIdentityKey: Partial<IdentityKey> = {
                id: 'ik-id',
                userId: mockUserId,
                publicKey: 'identity-key-base64',
            };

            keyStorage.getIdentityKey.mockResolvedValue(mockIdentityKey as IdentityKey);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(null);

            await expect(service.getBundleForUser(mockUserId)).rejects.toThrow(
                NotFoundException,
            );

            expect(keyStorage.getUnusedPreKey).not.toHaveBeenCalled();
        });
    });

    describe('consumePreKey', () => {
        it('should mark a prekey as used', async () => {
            const preKeyId = 'pk-id';
            keyStorage.markPreKeyAsUsed.mockResolvedValue(undefined);

            await service.consumePreKey(preKeyId);

            expect(keyStorage.markPreKeyAsUsed).toHaveBeenCalledWith(preKeyId);
        });
    });

    describe('getPreKeyStatus', () => {
        it('should return status with sufficient prekeys', async () => {
            const mockSignedPreKey: Partial<SignedPreKey> = {
                id: 'spk-id',
                keyId: 1,
            };

            keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );

            const result = await service.getPreKeyStatus(mockUserId);

            expect(result).toEqual({
                userId: mockUserId,
                availablePreKeys: 50,
                isLow: false,
                hasActiveSignedPreKey: true,
                totalPreKeys: 50,
                recommendedUpload: 0,
            });
        });

        it('should return status indicating low prekeys', async () => {
            const mockSignedPreKey: Partial<SignedPreKey> = {
                id: 'spk-id',
                keyId: 1,
            };

            keyStorage.getUnusedPreKeyCount.mockResolvedValue(10);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );

            const result = await service.getPreKeyStatus(mockUserId);

            expect(result.isLow).toBe(true);
            expect(result.recommendedUpload).toBe(90); // 100 - 10
        });

        it('should return status with no active signed prekey', async () => {
            keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(null);

            const result = await service.getPreKeyStatus(mockUserId);

            expect(result.hasActiveSignedPreKey).toBe(false);
        });
    });

    describe('needsPreKeyReplenishment', () => {
        it('should return true if prekey count is below threshold', async () => {
            keyStorage.getUnusedPreKeyCount.mockResolvedValue(15);

            const result = await service.needsPreKeyReplenishment(mockUserId);

            expect(result).toBe(true);
        });

        it('should return false if prekey count is above threshold', async () => {
            keyStorage.getUnusedPreKeyCount.mockResolvedValue(50);

            const result = await service.needsPreKeyReplenishment(mockUserId);

            expect(result).toBe(false);
        });
    });

    describe('getBundlesForUsers', () => {
        it('should return bundles for multiple users', async () => {
            const userIds = ['user1', 'user2'];

            const mockIdentityKey: Partial<IdentityKey> = {
                publicKey: 'identity-key',
            };

            const mockSignedPreKey: Partial<SignedPreKey> = {
                keyId: 1,
                publicKey: 'signed-prekey',
                signature: 'signature',
            };

            keyStorage.getIdentityKey.mockResolvedValue(mockIdentityKey as IdentityKey);
            keyStorage.getActiveSignedPreKey.mockResolvedValue(
                mockSignedPreKey as SignedPreKey,
            );
            keyStorage.getUnusedPreKey.mockResolvedValue(null);

            const result = await service.getBundlesForUsers(userIds);

            expect(result.size).toBe(2);
            expect(result.has('user1')).toBe(true);
            expect(result.has('user2')).toBe(true);
        });

        it('should handle failures for individual users', async () => {
            const userIds = ['user1', 'user2'];

            keyStorage.getIdentityKey.mockResolvedValueOnce(null); // Fails for user1
            keyStorage.getIdentityKey.mockResolvedValueOnce({
                publicKey: 'key',
            } as IdentityKey); // Succeeds for user2

            keyStorage.getActiveSignedPreKey.mockResolvedValue({
                keyId: 1,
                publicKey: 'spk',
                signature: 'sig',
            } as SignedPreKey);
            keyStorage.getUnusedPreKey.mockResolvedValue(null);

            const result = await service.getBundlesForUsers(userIds);

            expect(result.size).toBe(1); // Only user2 succeeds
            expect(result.has('user2')).toBe(true);
            expect(result.has('user1')).toBe(false);
        });
    });
});
