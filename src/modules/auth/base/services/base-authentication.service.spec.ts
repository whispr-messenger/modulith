import { Test, TestingModule } from '@nestjs/testing';
import { BaseAuthenticationService } from './base-authentication.service';
import { UserAuthService } from '../../common/services/user-auth.service';
import { PhoneVerificationService } from '../../phone-verification/services/phone-verification/phone-verification.service';
import { TokensService } from '../../tokens/services/tokens.service';
import { DevicesService } from '../../devices/services/devices.service';
import { UserAuth } from '../../common/entities/user-auth.entity';
import { RegisterDto } from '../dto/register.dto';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';

describe('BaseAuthenticationService', () => {
    let service: BaseAuthenticationService;
    let userAuthService: UserAuthService;
    let verificationService: PhoneVerificationService;
    let tokensService: TokensService;
    let devicesService: DevicesService;

    const mockUser: UserAuth = {
        id: 'user-id-1',
        phoneNumber: '+1234567890',
        twoFactorEnabled: false,
        lastAuthenticatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorSecret: null,
    };

    const mockUserAuthService = {
        findByPhoneNumber: jest.fn(),
        createUser: jest.fn(),
        saveUser: jest.fn(),
    };

    const mockVerificationService = {
        verifyCode: jest.fn(),
        consumeVerification: jest.fn(),
    };

    const mockTokensService = {
        generateTokenPair: jest.fn(),
        revokeAllTokensForDevice: jest.fn(),
    };

    const mockDevicesService = {
        registerDevice: jest.fn(),
        updateLastActive: jest.fn(),
    };

    const fingerprint: DeviceFingerprint = {
        userAgent: 'TestAgent',
        ipAddress: '127.0.0.1',
        deviceType: 'ios',
        timestamp: Date.now(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BaseAuthenticationService,
                { provide: UserAuthService, useValue: mockUserAuthService },
                { provide: PhoneVerificationService, useValue: mockVerificationService },
                { provide: TokensService, useValue: mockTokensService },
                { provide: DevicesService, useValue: mockDevicesService },
            ],
        }).compile();

        service = module.get<BaseAuthenticationService>(BaseAuthenticationService);
        userAuthService = module.get<UserAuthService>(UserAuthService);
        verificationService = module.get<PhoneVerificationService>(PhoneVerificationService);
        tokensService = module.get<TokensService>(TokensService);
        devicesService = module.get<DevicesService>(DevicesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        const registerDto: RegisterDto = {
            phoneNumber: '+1234567890',
            verificationId: 'verif-id',
            deviceType: 'ios',
            deviceName: 'My iPhone',
            publicKey: 'rsa-key',
        };

        it('should successfully register a new user', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'registration',
                phoneNumber: registerDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);
            mockUserAuthService.createUser.mockReturnValue(mockUser);
            mockUserAuthService.saveUser.mockResolvedValue(mockUser);
            mockDevicesService.registerDevice.mockResolvedValue({ id: 'device-id' });
            mockTokensService.generateTokenPair.mockResolvedValue({
                accessToken: 'access',
                refreshToken: 'refresh',
                expiresIn: 3600,
            });

            const result = await service.register(registerDto, fingerprint);

            expect(mockVerificationService.verifyCode).toHaveBeenCalledWith(registerDto.verificationId, '');
            expect(mockUserAuthService.findByPhoneNumber).toHaveBeenCalledWith(registerDto.phoneNumber);
            expect(mockUserAuthService.createUser).toHaveBeenCalled();
            expect(mockUserAuthService.saveUser).toHaveBeenCalled();
            expect(mockDevicesService.registerDevice).toHaveBeenCalled();
            expect(mockVerificationService.consumeVerification).toHaveBeenCalledWith(registerDto.verificationId);
            expect(mockTokensService.generateTokenPair).toHaveBeenCalledWith(mockUser.id, 'device-id', fingerprint);
            expect(result).toBeDefined();
        });

        it('should throw BadRequestException if verification purpose is wrong', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'login',
                phoneNumber: registerDto.phoneNumber,
            });

            await expect(service.register(registerDto, fingerprint)).rejects.toThrow(BadRequestException);
        });

        it('should throw ConflictException if user already exists', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'registration',
                phoneNumber: registerDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(mockUser);

            await expect(service.register(registerDto, fingerprint)).rejects.toThrow(ConflictException);
        });

        it('should use "web-session" if device info is missing', async () => {
            const webDto = { ...registerDto, deviceName: undefined };
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'registration',
                phoneNumber: registerDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);
            mockUserAuthService.createUser.mockReturnValue(mockUser);
            mockUserAuthService.saveUser.mockResolvedValue(mockUser);
            mockTokensService.generateTokenPair.mockResolvedValue({
                accessToken: 'access',
                refreshToken: 'refresh',
                expiresIn: 3600,
            });

            await service.register(webDto, fingerprint);
            expect(mockDevicesService.registerDevice).not.toHaveBeenCalled();
            expect(mockTokensService.generateTokenPair).toHaveBeenCalledWith(mockUser.id, 'web-session', fingerprint);
        });
    });

    describe('login', () => {
        const loginDto: LoginDto = {
            phoneNumber: '+1234567890',
            verificationId: 'verif-id',
            deviceType: 'ios',
            deviceName: 'My iPhone',
            publicKey: 'rsa-key',
        };

        it('should successfully login an existing user', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'login',
                phoneNumber: loginDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(mockUser);
            mockDevicesService.registerDevice.mockResolvedValue({ id: 'device-id' });
            mockTokensService.generateTokenPair.mockResolvedValue({
                accessToken: 'access',
                refreshToken: 'refresh',
                expiresIn: 3600,
            });

            const result = await service.login(loginDto, fingerprint);

            expect(mockVerificationService.verifyCode).toHaveBeenCalledWith(loginDto.verificationId, '');
            expect(mockUserAuthService.findByPhoneNumber).toHaveBeenCalledWith(loginDto.phoneNumber);
            expect(mockUserAuthService.saveUser).toHaveBeenCalledWith(expect.objectContaining({
                lastAuthenticatedAt: expect.any(Date)
            }));
            expect(mockDevicesService.registerDevice).toHaveBeenCalled();
            expect(mockVerificationService.consumeVerification).toHaveBeenCalledWith(loginDto.verificationId);
            expect(mockTokensService.generateTokenPair).toHaveBeenCalledWith(mockUser.id, 'device-id', fingerprint);
            expect(result).toBeDefined();
        });

        it('should throw BadRequestException if verification purpose is wrong', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'registration',
                phoneNumber: loginDto.phoneNumber,
            });

            await expect(service.login(loginDto, fingerprint)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if user not found', async () => {
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'login',
                phoneNumber: loginDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);

            await expect(service.login(loginDto, fingerprint)).rejects.toThrow(BadRequestException);
        });

        it('should use "web-session" if device info is missing', async () => {
            const webDto = { ...loginDto, deviceName: undefined };
            mockVerificationService.verifyCode.mockResolvedValue({
                purpose: 'login',
                phoneNumber: loginDto.phoneNumber,
            });
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(mockUser);
            mockTokensService.generateTokenPair.mockResolvedValue({
                accessToken: 'access',
                refreshToken: 'refresh',
                expiresIn: 3600,
            });

            await service.login(webDto, fingerprint);
            expect(mockDevicesService.registerDevice).not.toHaveBeenCalled();
            expect(mockTokensService.generateTokenPair).toHaveBeenCalledWith(mockUser.id, 'web-session', fingerprint);
        });
    });

    describe('logout', () => {
        it('should revoke all tokens for device', async () => {
            await service.logout('user-id', 'device-id');
            expect(mockTokensService.revokeAllTokensForDevice).toHaveBeenCalledWith('device-id');
        });

        it('should update last active if not web session', async () => {
            await service.logout('user-id', 'device-id');
            expect(mockDevicesService.updateLastActive).toHaveBeenCalledWith('device-id');
        });

        it('should NOT update last active if web session', async () => {
            await service.logout('user-id', 'web-session');
            expect(mockDevicesService.updateLastActive).not.toHaveBeenCalled();
        });
    });
});
