import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BackupCodesService } from './backup-codes.service';
import { BackupCode } from '../../base/entities/backup-code.entity';
import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

jest.mock('bcrypt');

describe('BackupCodesService', () => {
	let service: BackupCodesService;
	let backupCodeRepository: Repository<BackupCode>;

	const mockBackupCodeRepository = {
		delete: jest.fn(),
		create: jest.fn(),
		save: jest.fn(),
		find: jest.fn(),
		count: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BackupCodesService,
				{
					provide: getRepositoryToken(BackupCode),
					useValue: mockBackupCodeRepository,
				},
			],
		}).compile();

		// Reset mocks
		jest.clearAllMocks();

		service = module.get<BackupCodesService>(BackupCodesService);
		backupCodeRepository = module.get<Repository<BackupCode>>(getRepositoryToken(BackupCode));
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateBackupCodes', () => {
		const userId = 'user-123';

		it('should generate 10 backup codes, hash them, and save them', async () => {
			(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
			mockBackupCodeRepository.create.mockImplementation((dto) => dto as BackupCode);
			mockBackupCodeRepository.save.mockResolvedValue([]);

			const codes = await service.generateBackupCodes(userId);

			expect(mockBackupCodeRepository.delete).toHaveBeenCalledWith({ userId });
			expect(codes).toHaveLength(10);
			expect(mockBackupCodeRepository.create).toHaveBeenCalledTimes(10);
			expect(mockBackupCodeRepository.save).toHaveBeenCalled();
			expect(bcrypt.hash).toHaveBeenCalledTimes(10);
		});
	});

	describe('verifyBackupCode', () => {
		const userId = 'user-123';
		const code = '1234-5678';
		const hashedCode = 'hashed-code';
		const mockBackupCodes = [
			{ userId, codeHash: hashedCode, used: false, usedAt: null } as BackupCode,
		];

		it('should verify a valid backup code and mark it as used', async () => {
			mockBackupCodeRepository.find.mockResolvedValue(mockBackupCodes);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);
			mockBackupCodeRepository.save.mockResolvedValue({ ...mockBackupCodes[0], used: true });

			const result = await service.verifyBackupCode(userId, code);

			expect(result).toBe(true);
			expect(mockBackupCodeRepository.find).toHaveBeenCalledWith({ where: { userId, used: false } });
			expect(bcrypt.compare).toHaveBeenCalledWith(code, hashedCode);
			expect(mockBackupCodeRepository.save).toHaveBeenCalledWith(expect.objectContaining({ used: true }));
		});

		it('should return false for an invalid backup code', async () => {
			mockBackupCodeRepository.find.mockResolvedValue(mockBackupCodes);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			const result = await service.verifyBackupCode(userId, code);

			expect(result).toBe(false);
			expect(mockBackupCodeRepository.save).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException if no backup codes found', async () => {
			mockBackupCodeRepository.find.mockResolvedValue([]);

			await expect(service.verifyBackupCode(userId, code)).rejects.toThrow(NotFoundException);
		});
	});

	describe('getRemainingCodesCount', () => {
		it('should return the count of unused backup codes', async () => {
			const userId = 'user-123';
			const count = 5;
			mockBackupCodeRepository.count.mockResolvedValue(count);

			const result = await service.getRemainingCodesCount(userId);

			expect(result).toBe(count);
			expect(mockBackupCodeRepository.count).toHaveBeenCalledWith({ where: { userId, used: false } });
		});
	});

	describe('hasBackupCodes', () => {
		it('should return true if user has backup codes', async () => {
			const userId = 'user-123';
			mockBackupCodeRepository.count.mockResolvedValue(5);

			const result = await service.hasBackupCodes(userId);

			expect(result).toBe(true);
		});

		it('should return false if user has no backup codes', async () => {
			const userId = 'user-123';
			mockBackupCodeRepository.count.mockResolvedValue(0);

			const result = await service.hasBackupCodes(userId);

			expect(result).toBe(false);
		});
	});

	describe('deleteAllBackupCodes', () => {
		it('should delete all backup codes for the user', async () => {
			const userId = 'user-123';

			await service.deleteAllBackupCodes(userId);

			expect(mockBackupCodeRepository.delete).toHaveBeenCalledWith({ userId });
		});
	});
});
