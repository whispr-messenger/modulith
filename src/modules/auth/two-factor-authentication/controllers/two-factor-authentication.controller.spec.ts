import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorAuthenticationController } from './two-factor-authentication.controller';
import { TwoFactorAuthenticationService } from '../services/two-factor-authentication.service';
import { JwtAuthGuard } from '../../base/guards';

describe('TwoFactorAuthenticationController', () => {
    let controller: TwoFactorAuthenticationController;
    let service: TwoFactorAuthenticationService;

    const mockTwoFactorService = {
        setupTwoFactor: jest.fn(),
        enableTwoFactor: jest.fn(),
        verifyTwoFactor: jest.fn(),
        disableTwoFactor: jest.fn(),
        generateNewBackupCodes: jest.fn(),
        isTwoFactorEnabled: jest.fn(),
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn().mockReturnValue(true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TwoFactorAuthenticationController],
            providers: [
                {
                    provide: TwoFactorAuthenticationService,
                    useValue: mockTwoFactorService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<TwoFactorAuthenticationController>(TwoFactorAuthenticationController);
        service = module.get<TwoFactorAuthenticationService>(TwoFactorAuthenticationService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('setupTwoFactor', () => {
        it('should call service.setupTwoFactor', async () => {
            const req = { user: { sub: 'user-123' } };
            const result = { secret: 'secret', qrCodeUrl: 'url', backupCodes: [] };
            mockTwoFactorService.setupTwoFactor.mockResolvedValue(result);

            expect(await controller.setupTwoFactor(req)).toBe(result);
            expect(mockTwoFactorService.setupTwoFactor).toHaveBeenCalledWith('user-123');
        });
    });

    describe('enableTwoFactor', () => {
        it('should call service.enableTwoFactor', async () => {
            const req = { user: { sub: 'user-123' } };
            const dto = { secret: 'secret', token: '123456' };
            mockTwoFactorService.enableTwoFactor.mockResolvedValue(undefined);

            await controller.enableTwoFactor(req, dto);

            expect(mockTwoFactorService.enableTwoFactor).toHaveBeenCalledWith('user-123', dto.secret, dto.token);
        });
    });

    describe('verifyTwoFactor', () => {
        it('should call service.verifyTwoFactor and return valid status', async () => {
            const req = { user: { sub: 'user-123' } };
            const dto = { token: '123456' };
            mockTwoFactorService.verifyTwoFactor.mockResolvedValue(true);

            expect(await controller.verifyTwoFactor(req, dto)).toEqual({ valid: true });
            expect(mockTwoFactorService.verifyTwoFactor).toHaveBeenCalledWith('user-123', dto.token);
        });
    });

    describe('disableTwoFactor', () => {
        it('should call service.disableTwoFactor', async () => {
            const req = { user: { sub: 'user-123' } };
            const dto = { token: '123456' };
            mockTwoFactorService.disableTwoFactor.mockResolvedValue(undefined);

            expect(await controller.disableTwoFactor(req, dto)).toEqual({ disabled: true });
            expect(mockTwoFactorService.disableTwoFactor).toHaveBeenCalledWith('user-123', dto.token);
        });
    });

    describe('generateBackupCodes', () => {
        it('should call service.generateNewBackupCodes', async () => {
            const req = { user: { sub: 'user-123' } };
            const dto = { token: '123456' };
            const codes = ['code1', 'code2'];
            mockTwoFactorService.generateNewBackupCodes.mockResolvedValue(codes);

            expect(await controller.generateBackupCodes(req, dto)).toEqual({ backupCodes: codes });
            expect(mockTwoFactorService.generateNewBackupCodes).toHaveBeenCalledWith('user-123', dto.token);
        });
    });

    describe('getTwoFactorStatus', () => {
        it('should call service.isTwoFactorEnabled', async () => {
            const req = { user: { sub: 'user-123' } };
            mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(true);

            expect(await controller.getTwoFactorStatus(req)).toEqual({ enabled: true });
            expect(mockTwoFactorService.isTwoFactorEnabled).toHaveBeenCalledWith('user-123');
        });
    });
});
