import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
    let service: SmsService;

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SmsService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<SmsService>(SmsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});