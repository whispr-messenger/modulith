import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from '../services/devices.service';
import { JwtAuthGuard } from '../../base/guards/jwt-auth.guard';

describe('DevicesController', () => {
    let controller: DevicesController;
    let service: DevicesService;

    const mockDevicesService = {
        getUserDevices: jest.fn(),
        revokeDevice: jest.fn(),
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn().mockReturnValue(true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DevicesController],
            providers: [
                {
                    provide: DevicesService,
                    useValue: mockDevicesService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<DevicesController>(DevicesController);
        service = module.get<DevicesService>(DevicesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getDevices', () => {
        it('should return list of devices', async () => {
            const req = { user: { sub: 'user-id' } };
            const devices = [{ id: 'dev-1', deviceName: 'iPhone' }];
            mockDevicesService.getUserDevices.mockResolvedValue(devices);

            const result = await controller.getDevices(req);
            expect(result).toBe(devices);
            expect(mockDevicesService.getUserDevices).toHaveBeenCalledWith('user-id');
        });
    });

    describe('revokeDevice', () => {
        it('should revoke device', async () => {
            const req = { user: { sub: 'user-id' } };
            const deviceId = 'dev-1';
            mockDevicesService.revokeDevice.mockResolvedValue(undefined);

            await controller.revokeDevice(req, deviceId);
            expect(mockDevicesService.revokeDevice).toHaveBeenCalledWith('user-id', deviceId);
        });
    });
});
