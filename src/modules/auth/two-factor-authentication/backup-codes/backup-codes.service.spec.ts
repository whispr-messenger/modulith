import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BackupCodesService } from './backup-codes.service';
import { BackupCode } from '../../base/entities/backup-code.entity';

describe('BackupCodesService', () => {
	let service: BackupCodesService;

	const mockBackupCodeRepository = {
		findOne: jest.fn(),
		save: jest.fn(),
		create: jest.fn(),
		find: jest.fn(),
		remove: jest.fn(),
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

		service = module.get<BackupCodesService>(BackupCodesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
