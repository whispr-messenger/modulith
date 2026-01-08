import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { Device } from './device.entity';

describe('DevicesService', () => {
	let service: DevicesService;

	const mockDeviceRepository = {
		findOne: jest.fn(),
		save: jest.fn(),
		create: jest.fn(),
		find: jest.fn(),
		remove: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DevicesService,
				{
					provide: getRepositoryToken(Device),
					useValue: mockDeviceRepository,
				},
			],
		}).compile();

		service = module.get<DevicesService>(DevicesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
