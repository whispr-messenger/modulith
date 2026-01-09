import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from '../services/devices.service';
import { DeviceResponseDto } from '../dto';
import { JwtAuthGuard } from '../../tokens/guards';

describe('DevicesController', () => {
	let controller: DevicesController;
	let devicesService: jest.Mocked<DevicesService>;

	const mockUserId = 'test-user-id';
	const mockDeviceId = 'test-device-id';

	const mockDevice: DeviceResponseDto = {
		id: mockDeviceId,
		deviceName: 'Test Device',
		deviceType: 'mobile',
		model: 'iPhone 15 Pro',
		osVersion: 'iOS 17.2',
		appVersion: '1.0.0',
		lastActive: new Date('2026-01-09T10:00:00Z'),
		createdAt: new Date('2026-01-01T00:00:00Z'),
		isVerified: true,
		fcmToken: 'test-fcm-token',
	};

	const mockRequest = {
		user: {
			sub: mockUserId,
		},
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [DevicesController],
			providers: [
				{
					provide: DevicesService,
					useValue: {
						getUserDevices: jest.fn(),
						revokeDevice: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: jest.fn(() => true),
			})
			.compile();

		controller = module.get<DevicesController>(DevicesController);
		devicesService = module.get(DevicesService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getDevices', () => {
		describe('Success cases', () => {
			it('should return an empty list when user has no devices', async () => {
				devicesService.getUserDevices.mockResolvedValue([]);

				const result = await controller.getDevices(mockRequest);

				expect(result).toEqual([]);
				expect(devicesService.getUserDevices).toHaveBeenCalledWith(mockUserId);
				expect(devicesService.getUserDevices).toHaveBeenCalledTimes(1);
			});

			it('should return a single device with all properties', async () => {
				devicesService.getUserDevices.mockResolvedValue([mockDevice]);

				const result = await controller.getDevices(mockRequest);

				expect(result).toEqual([mockDevice]);
				expect(result).toHaveLength(1);
				expect(result[0]).toHaveProperty('id');
				expect(result[0]).toHaveProperty('deviceName');
				expect(result[0]).toHaveProperty('deviceType');
				expect(result[0]).toHaveProperty('model');
				expect(result[0]).toHaveProperty('osVersion');
				expect(result[0]).toHaveProperty('appVersion');
				expect(result[0]).toHaveProperty('lastActive');
				expect(result[0]).toHaveProperty('createdAt');
				expect(result[0]).toHaveProperty('isVerified');
				expect(devicesService.getUserDevices).toHaveBeenCalledWith(mockUserId);
			});

			it('should return multiple devices for a user', async () => {
				const mockDevices: DeviceResponseDto[] = [
					mockDevice,
					{
						...mockDevice,
						id: 'device-2',
						deviceName: 'Test Device 2',
						deviceType: 'desktop',
					},
					{
						...mockDevice,
						id: 'device-3',
						deviceName: 'Test Device 3',
						deviceType: 'web',
					},
				];

				devicesService.getUserDevices.mockResolvedValue(mockDevices);

				const result = await controller.getDevices(mockRequest);

				expect(result).toEqual(mockDevices);
				expect(result).toHaveLength(3);
				expect(devicesService.getUserDevices).toHaveBeenCalledWith(mockUserId);
			});

			it('should pass the correct userId from request to the service', async () => {
				const customUserId = 'custom-user-id';
				const customRequest = {
					user: {
						sub: customUserId,
					},
				};

				devicesService.getUserDevices.mockResolvedValue([]);

				await controller.getDevices(customRequest);

				expect(devicesService.getUserDevices).toHaveBeenCalledWith(customUserId);
			});
		});

		describe('Data validation', () => {
			it('should return properly formed DeviceResponseDto objects', async () => {
				devicesService.getUserDevices.mockResolvedValue([mockDevice]);

				const result = await controller.getDevices(mockRequest);

				expect(result[0].id).toBe(mockDeviceId);
				expect(result[0].deviceName).toBe('Test Device');
				expect(result[0].deviceType).toBe('mobile');
				expect(result[0].model).toBe('iPhone 15 Pro');
				expect(result[0].osVersion).toBe('iOS 17.2');
				expect(result[0].appVersion).toBe('1.0.0');
				expect(result[0].isVerified).toBe(true);
			});

			it('should include all required fields in the response', async () => {
				const deviceWithoutOptionalFields: DeviceResponseDto = {
					id: mockDeviceId,
					deviceName: 'Minimal Device',
					deviceType: 'mobile',
					lastActive: new Date(),
					createdAt: new Date(),
					isVerified: false,
				};

				devicesService.getUserDevices.mockResolvedValue([
					deviceWithoutOptionalFields,
				]);

				const result = await controller.getDevices(mockRequest);

				expect(result[0]).toHaveProperty('id');
				expect(result[0]).toHaveProperty('deviceName');
				expect(result[0]).toHaveProperty('deviceType');
				expect(result[0]).toHaveProperty('lastActive');
				expect(result[0]).toHaveProperty('createdAt');
				expect(result[0]).toHaveProperty('isVerified');
			});
		});

		describe('Error cases', () => {
			it('should propagate service errors', async () => {
				const error = new Error('Database connection error');
				devicesService.getUserDevices.mockRejectedValue(error);

				await expect(controller.getDevices(mockRequest)).rejects.toThrow(error);
			});
		});
	});

	describe('revokeDevice', () => {
		describe('Success cases', () => {
			it('should return void when device is successfully revoked', async () => {
				devicesService.revokeDevice.mockResolvedValue(undefined);

				const result = await controller.revokeDevice(mockRequest, mockDeviceId);

				expect(result).toBeUndefined();
				expect(devicesService.revokeDevice).toHaveBeenCalledWith(
					mockUserId,
					mockDeviceId,
				);
				expect(devicesService.revokeDevice).toHaveBeenCalledTimes(1);
			});

			it('should call the service with correct parameters', async () => {
				devicesService.revokeDevice.mockResolvedValue(undefined);

				await controller.revokeDevice(mockRequest, mockDeviceId);

				expect(devicesService.revokeDevice).toHaveBeenCalledWith(
					mockUserId,
					mockDeviceId,
				);
			});

			it('should use the userId from the JWT token', async () => {
				const customUserId = 'another-user-id';
				const customRequest = {
					user: {
						sub: customUserId,
					},
				};

				devicesService.revokeDevice.mockResolvedValue(undefined);

				await controller.revokeDevice(customRequest, mockDeviceId);

				expect(devicesService.revokeDevice).toHaveBeenCalledWith(
					customUserId,
					mockDeviceId,
				);
			});
		});

		describe('Parameter validation', () => {
			it('should accept a valid UUID as deviceId', async () => {
				const validUuid = '550e8400-e29b-41d4-a716-446655440000';
				devicesService.revokeDevice.mockResolvedValue(undefined);

				await controller.revokeDevice(mockRequest, validUuid);

				expect(devicesService.revokeDevice).toHaveBeenCalledWith(
					mockUserId,
					validUuid,
				);
			});

			it('should handle different deviceId formats', async () => {
				const deviceIds = ['device-1', 'abc123', 'test-device-id-long-format'];

				for (const deviceId of deviceIds) {
					devicesService.revokeDevice.mockResolvedValue(undefined);

					await controller.revokeDevice(mockRequest, deviceId);

					expect(devicesService.revokeDevice).toHaveBeenCalledWith(
						mockUserId,
						deviceId,
					);
				}
			});
		});

		describe('Error cases', () => {
			it('should throw NotFoundException when device does not exist', async () => {
				devicesService.revokeDevice.mockRejectedValue(
					new NotFoundException('Device not found'),
				);

				await expect(
					controller.revokeDevice(mockRequest, 'non-existent-device'),
				).rejects.toThrow(NotFoundException);
			});

			it('should throw NotFoundException when device does not belong to user', async () => {
				devicesService.revokeDevice.mockRejectedValue(
					new NotFoundException('Device not found'),
				);

				await expect(
					controller.revokeDevice(mockRequest, 'other-user-device'),
				).rejects.toThrow(NotFoundException);
			});

			it('should propagate service exceptions', async () => {
				const error = new Error('Database error');
				devicesService.revokeDevice.mockRejectedValue(error);

				await expect(
					controller.revokeDevice(mockRequest, mockDeviceId),
				).rejects.toThrow(error);
			});

			it('should handle service throwing other types of errors', async () => {
				const customError = new Error('Unexpected error');
				devicesService.revokeDevice.mockRejectedValue(customError);

				await expect(
					controller.revokeDevice(mockRequest, mockDeviceId),
				).rejects.toThrow(customError);
			});
		});
	});

	describe('Controller behavior', () => {
		it('should inject DevicesService correctly', () => {
			expect(controller['deviceService']).toBeDefined();
			expect(controller['deviceService']).toBe(devicesService);
		});

		it('should delegate business logic to the service', async () => {
			devicesService.getUserDevices.mockResolvedValue([mockDevice]);

			await controller.getDevices(mockRequest);

			// Controller should not contain business logic
			expect(devicesService.getUserDevices).toHaveBeenCalled();
		});

		it('should not modify data returned by the service', async () => {
			const serviceResponse = [mockDevice];
			devicesService.getUserDevices.mockResolvedValue(serviceResponse);

			const result = await controller.getDevices(mockRequest);

			expect(result).toBe(serviceResponse);
		});
	});

	describe('Integration with Guards and Decorators', () => {
		it('should be protected by JwtAuthGuard', () => {
			const guards = Reflect.getMetadata(
				'__guards__',
				controller.getDevices,
			);
			// Note: This test verifies the guard is applied via decorator
			// Actual authentication is tested at the E2E level
			expect(guards).toBeDefined();
		});

		it('should extract userId from JWT token in request', async () => {
			const requestWithToken = {
				user: {
					sub: 'token-user-id',
					email: 'test@example.com',
				},
			};

			devicesService.getUserDevices.mockResolvedValue([]);

			await controller.getDevices(requestWithToken);

			expect(devicesService.getUserDevices).toHaveBeenCalledWith(
				'token-user-id',
			);
		});
	});

	describe('API Documentation', () => {
		it('should have proper Swagger decorators on getDevices', () => {
			const metadata = Reflect.getMetadata('swagger/apiOperation', controller.getDevices);
			expect(metadata).toBeDefined();
		});

		it('should have proper Swagger decorators on revokeDevice', () => {
			const metadata = Reflect.getMetadata('swagger/apiOperation', controller.revokeDevice);
			expect(metadata).toBeDefined();
		});
	});
});
