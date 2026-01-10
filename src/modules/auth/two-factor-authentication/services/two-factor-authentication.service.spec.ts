import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { BackupCodesService } from './backup-codes/backup-codes.service';
import { UserAuth } from '../common/entities/user-auth.entity';

describe('TwoFactorAuthenticationService', () => {
    let service: TwoFactorAuthenticationService;

    const mockUserAuthRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
    };

    const mockBackupCodesService = {
        generateBackupCodes: jest.fn(),
        validateBackupCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TwoFactorAuthenticationService,
                {
                    provide: getRepositoryToken(UserAuth),
                    useValue: mockUserAuthRepository,
                },
                {
                    provide: BackupCodesService,
                    useValue: mockBackupCodesService,
                },
            ],
        }).compile();

        service = module.get<TwoFactorAuthenticationService>(TwoFactorAuthenticationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});