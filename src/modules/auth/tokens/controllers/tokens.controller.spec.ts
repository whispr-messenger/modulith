import { Test, TestingModule } from '@nestjs/testing';
import { TokensController } from './tokens.controller';
import { TokensService } from '../services/tokens.service';

describe('TokensController', () => {
    let controller: TokensController;

    const mockTokensService = {
        refreshAccessToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TokensController],
            providers: [
                {
                    provide: TokensService,
                    useValue: mockTokensService,
                },
            ],
        }).compile();

        controller = module.get<TokensController>(TokensController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});