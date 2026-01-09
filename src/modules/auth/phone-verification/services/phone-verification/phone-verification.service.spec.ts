import { Test, TestingModule } from '@nestjs/testing';
import { PhoneVerificationService } from './phone-verification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserAuth } from '../../../common/entities/user-auth.entity';
import { UserAuthService } from '../../../common/services/user-auth.service';
import { SmsService } from '../sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('PhoneVerificationService', () => {
    let service: PhoneVerificationService;
    let cacheManager: any;
    let smsService: SmsService;
    let userAuthService: UserAuthService;

    const mockUserAuthRepository = {};
    const mockCacheManager = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };
    const mockSmsService = {
        sendVerificationCode: jest.fn(),
    };
    const mockUserAuthService = {
        findByPhoneNumber: jest.fn(),
    };
    const mockConfigService = {
        get: jest.fn().mockReturnValue('false'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PhoneVerificationService,
                {
                    provide: getRepositoryToken(UserAuth),
                    useValue: mockUserAuthRepository,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: SmsService,
                    useValue: mockSmsService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: UserAuthService,
                    useValue: mockUserAuthService,
                },
            ],
        }).compile();

        service = module.get<PhoneVerificationService>(PhoneVerificationService);
        cacheManager = module.get(CACHE_MANAGER);
        smsService = module.get<SmsService>(SmsService);
        userAuthService = module.get<UserAuthService>(UserAuthService);

        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('requestRegistrationVerification', () => {
        it('should throw ConflictException if user exists', async () => {
            mockUserAuthService.findByPhoneNumber.mockResolvedValue({});
            await expect(
                service.requestRegistrationVerification({ phoneNumber: '+1234567890' })
            ).rejects.toThrow(ConflictException);
        });

        it('should return verificationId on success', async () => {
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);
            mockCacheManager.get.mockResolvedValue(null); // Rate limit

            const result = await service.requestRegistrationVerification({ phoneNumber: '+33612345678' });

            expect(result.verificationId).toBeDefined();
            expect(mockSmsService.sendVerificationCode).toHaveBeenCalled();
            expect(mockCacheManager.set).toHaveBeenCalled();
        });
    });

    describe('requestLoginVerification', () => {
        it('should throw BadRequestException if user not found', async () => {
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);
            await expect(
                service.requestLoginVerification({ phoneNumber: '+1234567890' })
            ).rejects.toThrow(BadRequestException);
        });

        it('should return verificationId on success', async () => {
            mockUserAuthService.findByPhoneNumber.mockResolvedValue({});
            mockCacheManager.get.mockResolvedValue(null);

            const result = await service.requestLoginVerification({ phoneNumber: '+33612345678' });
            expect(result.verificationId).toBeDefined();
            expect(mockSmsService.sendVerificationCode).toHaveBeenCalled();
        });
    });

    describe('confirmRegistrationVerification', () => {
        it('should return verified: true on success', async () => {
            const verificationData = {
                hashedCode: 'hashed-code',
                attempts: 0,
                expiresAt: Date.now() + 10000,
                phoneNumber: '+33612345678',
            };
            mockCacheManager.get.mockResolvedValue(JSON.stringify(verificationData));
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.confirmRegistrationVerification({ verificationId: 'id', code: '123456' });
            expect(result.verified).toBe(true);
        });

        it('should throw BadRequestException if code is invalid', async () => {
            const verificationData = {
                hashedCode: 'hashed-code',
                attempts: 0,
                expiresAt: Date.now() + 10000,
                phoneNumber: '+33612345678',
            };
            mockCacheManager.get.mockResolvedValue(JSON.stringify(verificationData));
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.confirmRegistrationVerification({ verificationId: 'id', code: 'wrong' })
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('confirmLoginVerification', () => {
        it('should return verified: true and requires2FA', async () => {
            const verificationData = {
                hashedCode: 'hashed-code',
                attempts: 0,
                expiresAt: Date.now() + 10000,
                phoneNumber: '+33612345678',
            };
            mockCacheManager.get.mockResolvedValue(JSON.stringify(verificationData));
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockUserAuthService.findByPhoneNumber.mockResolvedValue({ twoFactorEnabled: true });

            const result = await service.confirmLoginVerification({ verificationId: 'id', code: '123456' });
            expect(result.verified).toBe(true);
            expect(result.requires2FA).toBe(true);
        });
    });

    describe('rate limiting', () => {
        it('should throw TooManyRequests if limit reached', async () => {
            mockUserAuthService.findByPhoneNumber.mockResolvedValue(null);
            mockCacheManager.get.mockResolvedValue("10"); // Over the limit

            await expect(
                service.requestRegistrationVerification({ phoneNumber: '+33612345678' })
            ).rejects.toThrow(HttpException);
        });
    });
});
