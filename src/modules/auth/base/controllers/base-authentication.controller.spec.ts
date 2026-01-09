import { Test, TestingModule } from '@nestjs/testing';
import { BaseAuthenticationController } from './base-authentication.controller';
import { BaseAuthenticationService } from '../services/base-authentication.service';
import { RegisterDto, LoginDto, LogoutDto } from '../dto';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';

import { JwtAuthGuard } from '../guards';

describe('BaseAuthenticationController', () => {
    let controller: BaseAuthenticationController;
    let authService: BaseAuthenticationService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn().mockReturnValue(true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BaseAuthenticationController],
            providers: [
                {
                    provide: BaseAuthenticationService,
                    useValue: mockAuthService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<BaseAuthenticationController>(BaseAuthenticationController);
        authService = module.get<BaseAuthenticationService>(BaseAuthenticationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should register a new user', async () => {
            const dto: RegisterDto = {
                phoneNumber: '+1234567890',
                verificationId: 'verif-1',
                deviceType: 'ios',
                deviceName: 'My iPhone',
                publicKey: 'pub-key',
            };
            const req = {
                headers: { 'user-agent': 'TestAgent' },
                ip: '127.0.0.1',
            };
            const expectedFingerprint: DeviceFingerprint = {
                userAgent: 'TestAgent',
                ipAddress: '127.0.0.1',
                deviceType: 'ios',
                timestamp: expect.any(Number),
            };
            const expectedResult = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiresIn: 3600,
            };

            mockAuthService.register.mockResolvedValue(expectedResult);

            const result = await controller.register(dto, req);

            expect(mockAuthService.register).toHaveBeenCalledWith(dto, expectedFingerprint);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('login', () => {
        it('should login a user', async () => {
            const dto: LoginDto = {
                phoneNumber: '+1234567890',
                verificationId: 'verif-1',
                deviceType: 'android',
                deviceName: 'My Android',
                publicKey: 'pub-key',
            };
            const req = {
                headers: { 'user-agent': 'TestAgent' },
                ip: '127.0.0.1',
            };
            const expectedFingerprint: DeviceFingerprint = {
                userAgent: 'TestAgent',
                ipAddress: '127.0.0.1',
                deviceType: 'android',
                timestamp: expect.any(Number),
            };
            const expectedResult = {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiresIn: 3600,
            };

            mockAuthService.login.mockResolvedValue(expectedResult);

            const result = await controller.login(dto, req);

            expect(mockAuthService.login).toHaveBeenCalledWith(dto, expectedFingerprint);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('logout', () => {
        it('should logout a user with DTO values', async () => {
            const dto: LogoutDto = {
                userId: 'user-1',
                deviceId: 'device-1',
            };
            const req = { user: { sub: 'req-user-1', deviceId: 'req-device-1' } };

            mockAuthService.logout.mockResolvedValue(undefined);

            await controller.logout(dto, req);

            expect(mockAuthService.logout).toHaveBeenCalledWith('user-1', 'device-1');
        });

        it('should logout a user with fallback to request user', async () => {
            const dto: LogoutDto = {};
            const req = { user: { sub: 'req-user-1', deviceId: 'req-device-1' } };

            mockAuthService.logout.mockResolvedValue(undefined);

            await controller.logout(dto, req);

            expect(mockAuthService.logout).toHaveBeenCalledWith('req-user-1', 'req-device-1');
        });
    });
});
