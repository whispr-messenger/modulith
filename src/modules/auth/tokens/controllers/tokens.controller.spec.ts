import { Test, TestingModule } from '@nestjs/testing';
import { TokensController } from './tokens.controller';
import { TokensService } from '../services/tokens.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

describe('TokensController', () => {
	let controller: TokensController;
	let service: TokensService;

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
		service = module.get<TokensService>(TokensService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('refreshToken', () => {
		it('should refresh token successfully', async () => {
			const dto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };
			const req = {
				headers: { 'user-agent': 'TestAgent' },
				ip: '127.0.0.1',
			};
			const result = {
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
			};

			mockTokensService.refreshAccessToken.mockResolvedValue(result);

			const response = await controller.refreshToken(dto, req);

			expect(mockTokensService.refreshAccessToken).toHaveBeenCalledWith(
				dto.refreshToken,
				expect.objectContaining({
					userAgent: 'TestAgent',
					ipAddress: '127.0.0.1',
				})
			);
			expect(response).toEqual(result);
		});
	});
});
