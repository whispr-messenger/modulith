import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { UserAuthService } from '../../common/services/user-auth.service';
import { BackupCodesService } from '../backup-codes/backup-codes.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

jest.mock('speakeasy');
jest.mock('qrcode');

describe('TwoFactorAuthenticationService', () => {
	let service: TwoFactorAuthenticationService;
	let userAuthService: UserAuthService;
	let backupCodesService: BackupCodesService;

	const mockUserAuthService = {
		findById: jest.fn(),
		saveUser: jest.fn(),
	};

	const mockBackupCodesService = {
		generateBackupCodes: jest.fn(),
		verifyBackupCode: jest.fn(),
		deleteAllBackupCodes: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TwoFactorAuthenticationService,
				{
					provide: UserAuthService,
					useValue: mockUserAuthService,
				},
				{
					provide: BackupCodesService,
					useValue: mockBackupCodesService,
				},
			],
		}).compile();

		// Reset mocks
		jest.clearAllMocks();

		service = module.get<TwoFactorAuthenticationService>(TwoFactorAuthenticationService);
		userAuthService = module.get<UserAuthService>(UserAuthService);
		backupCodesService = module.get<BackupCodesService>(BackupCodesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('setupTwoFactor', () => {
		const userId = 'user-123';
		const mockUser = { id: userId, phoneNumber: '1234567890', twoFactorEnabled: false };

		it('should setup 2FA successfully', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.generateSecret as jest.Mock).mockReturnValue({
				otpauth_url: 'otpauth://test',
				base32: 'SECRETBASE32',
			});
			(QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockqr');
			mockBackupCodesService.generateBackupCodes.mockResolvedValue(['code1', 'code2']);

			const result = await service.setupTwoFactor(userId);

			expect(mockUserAuthService.findById).toHaveBeenCalledWith(userId);
			expect(speakeasy.generateSecret).toHaveBeenCalled();
			expect(QRCode.toDataURL).toHaveBeenCalledWith('otpauth://test');
			expect(mockBackupCodesService.generateBackupCodes).toHaveBeenCalledWith(userId);
			expect(result).toEqual({
				secret: 'SECRETBASE32',
				qrCodeUrl: 'data:image/png;base64,mockqr',
				backupCodes: ['code1', 'code2'],
			});
		});

		it('should throw BadRequestException if user not found', async () => {
			mockUserAuthService.findById.mockResolvedValue(null);

			await expect(service.setupTwoFactor(userId)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if 2FA already enabled', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser, twoFactorEnabled: true });

			await expect(service.setupTwoFactor(userId)).rejects.toThrow(BadRequestException);
		});
	});

	describe('enableTwoFactor', () => {
		const userId = 'user-123';
		const secret = 'SECRETBASE32';
		const token = '123456';
		const mockUser = { id: userId, twoFactorEnabled: false, twoFactorSecret: null };

		it('should enable 2FA successfully with valid token', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
			mockUserAuthService.saveUser.mockResolvedValue(updatedUser => updatedUser);

			await service.enableTwoFactor(userId, secret, token);

			expect(speakeasy.totp.verify).toHaveBeenCalledWith({
				secret,
				encoding: 'base32',
				token,
				window: 2,
			});
			expect(mockUserAuthService.saveUser).toHaveBeenCalledWith(expect.objectContaining({
				twoFactorEnabled: true,
				twoFactorSecret: secret,
			}));
		});

		it('should throw BadRequestException for invalid token', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

			await expect(service.enableTwoFactor(userId, secret, token)).rejects.toThrow(BadRequestException);
		});
	});

	describe('verifyTwoFactor', () => {
		const userId = 'user-123';
		const token = '123456';
		const secret = 'SECRETBASE32';
		const mockUser = { id: userId, twoFactorEnabled: true, twoFactorSecret: secret };

		it('should verify successfully with valid TOTP token', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

			const result = await service.verifyTwoFactor(userId, token);

			expect(result).toBe(true);
			expect(speakeasy.totp.verify).toHaveBeenCalled();
			expect(mockBackupCodesService.verifyBackupCode).not.toHaveBeenCalled();
		});

		it('should check backup codes if TOTP fails', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
			mockBackupCodesService.verifyBackupCode.mockResolvedValue(true);

			const result = await service.verifyTwoFactor(userId, token);

			expect(result).toBe(true);
			expect(mockBackupCodesService.verifyBackupCode).toHaveBeenCalledWith(userId, token);
		});

		it('should return false if both TOTP and backup code fail', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser });
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
			mockBackupCodesService.verifyBackupCode.mockResolvedValue(false);

			const result = await service.verifyTwoFactor(userId, token);

			expect(result).toBe(false);
		});

		it('should throw BadRequestException if 2FA not enabled', async () => {
			mockUserAuthService.findById.mockResolvedValue({ ...mockUser, twoFactorEnabled: false });

			await expect(service.verifyTwoFactor(userId, token)).rejects.toThrow(BadRequestException);
		});
	});

	describe('disableTwoFactor', () => {
		const userId = 'user-123';
		const token = '123456';
		const secret = 'SECRETBASE32';
		const getMockUser = () => ({ id: userId, twoFactorEnabled: true, twoFactorSecret: secret });

		it('should disable 2FA successfully', async () => {
			mockUserAuthService.findById.mockResolvedValue(getMockUser());
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(true); // For verifyTwoFactor internal call

			await service.disableTwoFactor(userId, token);

			expect(mockBackupCodesService.deleteAllBackupCodes).toHaveBeenCalledWith(userId);
			expect(mockUserAuthService.saveUser).toHaveBeenCalledWith(expect.objectContaining({
				twoFactorEnabled: false,
				twoFactorSecret: '',
			}));
		});

		it('should throw UnauthorizedException if verification fails', async () => {
			mockUserAuthService.findById.mockResolvedValue(getMockUser());
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
			mockBackupCodesService.verifyBackupCode.mockResolvedValue(false);

			await expect(service.disableTwoFactor(userId, token)).rejects.toThrow(UnauthorizedException);
		});
	});

	describe('generateNewBackupCodes', () => {
		const userId = 'user-123';
		const token = '123456';
		const secret = 'SECRETBASE32';
		const getMockUser = () => ({ id: userId, twoFactorEnabled: true, twoFactorSecret: secret });

		it('should generate new backup codes if verification succeeds', async () => {
			mockUserAuthService.findById.mockResolvedValue(getMockUser());
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
			const newCodes = ['new1', 'new2'];
			mockBackupCodesService.generateBackupCodes.mockResolvedValue(newCodes);

			const result = await service.generateNewBackupCodes(userId, token);

			expect(result).toBe(newCodes);
			expect(mockBackupCodesService.generateBackupCodes).toHaveBeenCalledWith(userId);
		});

		it('should throw UnauthorizedException if verification fails', async () => {
			mockUserAuthService.findById.mockResolvedValue(getMockUser());
			(speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
			mockBackupCodesService.verifyBackupCode.mockResolvedValue(false);

			await expect(service.generateNewBackupCodes(userId, token)).rejects.toThrow(UnauthorizedException);
		});
	});
});
