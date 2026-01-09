import { Test, TestingModule } from '@nestjs/testing';
import { PhoneVerificationController } from './phone-verification.controller';
import { PhoneVerificationService } from '../services';
import { VerificationRequestDto, VerificationConfirmDto } from '../dto';

describe('PhoneVerificationController', () => {
    let controller: PhoneVerificationController;
    let service: PhoneVerificationService;

    const mockPhoneVerificationService = {
        requestRegistrationVerification: jest.fn(),
        confirmRegistrationVerification: jest.fn(),
        requestLoginVerification: jest.fn(),
        confirmLoginVerification: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PhoneVerificationController],
            providers: [
                {
                    provide: PhoneVerificationService,
                    useValue: mockPhoneVerificationService,
                },
            ],
        }).compile();

        controller = module.get<PhoneVerificationController>(PhoneVerificationController);
        service = module.get<PhoneVerificationService>(PhoneVerificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('requestRegistrationVerification', () => {
        it('should call service with dto', async () => {
            const dto: VerificationRequestDto = { phoneNumber: '+1234567890' };
            const result = { verificationId: 'id' };
            mockPhoneVerificationService.requestRegistrationVerification.mockResolvedValue(result);

            expect(await controller.requestRegistrationVerification(dto)).toBe(result);
            expect(mockPhoneVerificationService.requestRegistrationVerification).toHaveBeenCalledWith(dto);
        });
    });

    describe('confirmRegistrationVerification', () => {
        it('should call service with dto', async () => {
            const dto: VerificationConfirmDto = { verificationId: 'id', code: '123456' };
            const result = { verified: true };
            mockPhoneVerificationService.confirmRegistrationVerification.mockResolvedValue(result);

            expect(await controller.confirmRegistrationVerification(dto)).toBe(result);
            expect(mockPhoneVerificationService.confirmRegistrationVerification).toHaveBeenCalledWith(dto);
        });
    });

    describe('requestLoginVerification', () => {
        it('should call service with dto', async () => {
            const dto: VerificationRequestDto = { phoneNumber: '+1234567890' };
            const result = { verificationId: 'id' };
            mockPhoneVerificationService.requestLoginVerification.mockResolvedValue(result);

            expect(await controller.requestLoginVerification(dto)).toBe(result);
            expect(mockPhoneVerificationService.requestLoginVerification).toHaveBeenCalledWith(dto);
        });
    });

    describe('confirmLoginVerification', () => {
        it('should call service with dto', async () => {
            const dto: VerificationConfirmDto = { verificationId: 'id', code: '123456' };
            const result = { verified: true, requires2FA: false };
            mockPhoneVerificationService.confirmLoginVerification.mockResolvedValue(result);

            expect(await controller.confirmLoginVerification(dto)).toBe(result);
            expect(mockPhoneVerificationService.confirmLoginVerification).toHaveBeenCalledWith(dto);
        });
    });
});
