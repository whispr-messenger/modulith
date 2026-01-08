import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UnauthorizedException } from '@nestjs/common';

import { TokensService } from './tokens.service';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';

describe('TokensService', () => {
	let service: TokensService;
	let jwtService: jest.Mocked<JwtService>;
	let cacheManager: jest.Mocked<Cache>;
	let configService: jest.Mocked<ConfigService>;

	const mockFingerprint: DeviceFingerprint = {
		userAgent: 'Mozilla/5.0',
		ipAddress: '127.0.0.1',
		deviceType: 'mobile',
		timestamp: Date.now(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TokensService,
				{
					provide: JwtService,
					useValue: {
						sign: jest.fn(),
						verify: jest.fn(),
						decode: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
				{
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						del: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<TokensService>(TokensService);
		jwtService = module.get(JwtService);
		cacheManager = module.get(CACHE_MANAGER);
		configService = module.get(ConfigService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateTokenPair', () => {
		it('should generate token pair successfully', async () => {
			const userId = 'user-id';
			const deviceId = 'device-id';
			const accessToken = 'access-token';
			const refreshToken = 'refresh-token';

			jwtService.sign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);
			cacheManager.set.mockResolvedValue(undefined);

			const result = await service.generateTokenPair(userId, deviceId, mockFingerprint);

			expect(jwtService.sign).toHaveBeenCalledTimes(2);
			expect(cacheManager.set).toHaveBeenCalled();
			expect(result).toEqual({
				accessToken,
				refreshToken,
			});
		});
	});

	describe('refreshAccessToken', () => {
		it('should refresh tokens successfully', async () => {
			const refreshToken = 'valid-refresh-token';
			const userId = 'user-id';
			const deviceId = 'device-id';
			const tokenId = 'token-id';
			const newAccessToken = 'new-access-token';
			const newRefreshToken = 'new-refresh-token';

			const decodedToken = {
				sub: userId,
				deviceId,
				tokenId: tokenId,
				type: 'refresh',
			};

			// Mock generateDeviceFingerprint to return consistent value
			const expectedFingerprint = 'b8c5a8c8e1f2';
			jest.spyOn(service as any, 'generateDeviceFingerprint').mockReturnValue(expectedFingerprint);

			const cachedData = {
				userId,
				deviceId,
				fingerprint: expectedFingerprint,
			};

			jwtService.verify.mockReturnValue(decodedToken);
			cacheManager.get.mockResolvedValue(JSON.stringify(cachedData));
			jwtService.sign.mockReturnValueOnce(newAccessToken).mockReturnValueOnce(newRefreshToken);
			cacheManager.del.mockResolvedValue(true);
			cacheManager.set.mockResolvedValue(undefined);
			configService.get.mockReturnValue('test-secret');

			const result = await service.refreshAccessToken(refreshToken, mockFingerprint);

			expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
				algorithms: ['ES256'],
			});
			expect(cacheManager.get).toHaveBeenCalledWith(`refresh_token:${tokenId}`);
			expect(result).toEqual({
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			});
		});

		it('should throw UnauthorizedException with invalid refresh token', async () => {
			const invalidRefreshToken = 'invalid-refresh-token';

			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			await expect(service.refreshAccessToken(invalidRefreshToken, mockFingerprint)).rejects.toThrow(
				UnauthorizedException
			);
		});

		it('should throw UnauthorizedException if token not found in cache', async () => {
			const refreshToken = 'valid-refresh-token';
			const tokenId = 'token-id';

			const decodedToken = {
				sub: 'user-id',
				deviceId: 'device-id',
				jti: tokenId,
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			jwtService.verify.mockReturnValue(decodedToken);
			cacheManager.get.mockResolvedValue(null);

			await expect(service.refreshAccessToken(refreshToken, mockFingerprint)).rejects.toThrow(
				UnauthorizedException
			);
		});
	});

	describe('revokeToken', () => {
		it('should revoke token successfully', async () => {
			const refreshToken = 'valid-refresh-token';
			const tokenId = 'token-id';

			const decodedToken = {
				tokenId: tokenId,
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			jwtService.decode.mockReturnValue(decodedToken);
			cacheManager.set.mockResolvedValue(undefined);

			await service.revokeToken(refreshToken);

			expect(jwtService.decode).toHaveBeenCalledWith(refreshToken);
			expect(cacheManager.set).toHaveBeenCalledWith(
				`revoked:${tokenId}`,
				expect.any(String),
				expect.any(Number)
			);
		});

		it('should handle invalid token gracefully', async () => {
			const invalidRefreshToken = 'invalid-refresh-token';

			jwtService.decode.mockReturnValue(null);

			await expect(service.revokeToken(invalidRefreshToken)).resolves.not.toThrow();
			expect(jwtService.decode).toHaveBeenCalledWith(invalidRefreshToken);
		});
	});
});
