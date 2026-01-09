import { Controller, Delete, Get, HttpCode, HttpStatus, Request, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../tokens/guards';
import { DevicesService } from '../services/devices.service';
import { DeviceResponseDto } from '../dto';

@Controller('devices')
export class DevicesController {
	constructor(private readonly deviceService: DevicesService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get all devices associated with user account' })
	@ApiResponse({ status: 200, description: 'List of user devices', type: [DeviceResponseDto] })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getDevices(@Request() req: any): Promise<DeviceResponseDto[]> {
		return this.deviceService.getUserDevices(req.user.sub);
	}

	@Delete(':deviceId')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Revoke/delete a specific device' })
	@ApiResponse({ status: 204, description: 'Device successfully revoked' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	async revokeDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
		return this.deviceService.revokeDevice(req.user.sub, deviceId);
	}
}
