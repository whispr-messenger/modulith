import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { UserAuthService } from '../../common/services/user-auth.service';
import { SmsService } from '../../phone-verification/services/sms/sms.service';
import { UserAuth } from '../../common/entities/user-auth.entity';

describe('NotificationService', () => {
    let service: NotificationService;
    let userAuthService: UserAuthService;
    let smsService: SmsService;

    const mockUser: UserAuth = {
        id: 'user-1',
        phoneNumber: '+1234567890',
        twoFactorEnabled: false,
    } as UserAuth;

    const mockUserAuthService = {
        findById: jest.fn(),
    };

    const mockSmsService = {
        sendSecurityAlert: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: UserAuthService, useValue: mockUserAuthService },
                { provide: SmsService, useValue: mockSmsService },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        userAuthService = module.get<UserAuthService>(UserAuthService);
        smsService = module.get<SmsService>(SmsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('notifyNewDeviceLogin', () => {
        it('should send alert if user exists', async () => {
            mockUserAuthService.findById.mockResolvedValue(mockUser);
            await service.notifyNewDeviceLogin({
                userId: 'user-1',
                deviceName: 'iPhone',
                deviceType: 'ios',
            });
            expect(mockSmsService.sendSecurityAlert).toHaveBeenCalledWith(mockUser.phoneNumber, 'new_device');
        });

        it('should not send alert if user not found', async () => {
            mockUserAuthService.findById.mockResolvedValue(null);
            await service.notifyNewDeviceLogin({
                userId: 'user-1',
                deviceName: 'iPhone',
                deviceType: 'ios',
            });
            expect(mockSmsService.sendSecurityAlert).not.toHaveBeenCalled();
        });
    });

    describe('notifyQRLogin', () => {
        it('should send alert if user exists', async () => {
            mockUserAuthService.findById.mockResolvedValue(mockUser);
            await service.notifyQRLogin('user-1');
            expect(mockSmsService.sendSecurityAlert).toHaveBeenCalledWith(mockUser.phoneNumber, 'suspicious_login');
        });

        it('should not send alert if user not found', async () => {
            mockUserAuthService.findById.mockResolvedValue(null);
            await service.notifyQRLogin('user-1');
            expect(mockSmsService.sendSecurityAlert).not.toHaveBeenCalled();
        });
    });

    describe('notifyDeviceRevoked', () => {
        it('should send alert if user exists', async () => {
            mockUserAuthService.findById.mockResolvedValue(mockUser);
            await service.notifyDeviceRevoked('user-1');
            expect(mockSmsService.sendSecurityAlert).toHaveBeenCalledWith(mockUser.phoneNumber, 'suspicious_login');
        });
    });

    describe('notify2FAStatusChange', () => {
        it('should send alert if user exists', async () => {
            mockUserAuthService.findById.mockResolvedValue(mockUser);
            await service.notify2FAStatusChange('user-1');
            expect(mockSmsService.sendSecurityAlert).toHaveBeenCalledWith(mockUser.phoneNumber, 'password_change');
        });
    });

    describe('notifyPasswordReset', () => {
        it('should send alert', async () => {
            await service.notifyPasswordReset('+1234567890');
            expect(mockSmsService.sendSecurityAlert).toHaveBeenCalledWith('+1234567890', 'password_change');
        });
    });
});
