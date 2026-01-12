import { Body, Controller, HttpCode, HttpStatus, Request, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../tokens/guards';
import { DeviceFingerprintService } from '../../services/device-fingerprint/device-fingerprint.service';
import { QuickResponseCodeService } from '../services/quick-response-code.service';
import { ScanLoginDto } from '../dto/scan-login.dto';

@ApiTags('Auth - QR Codes')
@Controller('auth/qr-code')
export class QuickResponseCodeController {
	constructor(
		private readonly quickResponseCodeService: QuickResponseCodeService,
		private readonly fingerprintService: DeviceFingerprintService,
	) { }

	@Post('/challenge/:deviceId')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Generate QR code challenge for device authentication' })
	@ApiResponse({ status: 200, description: 'QR challenge generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Device not found' })
	async generateQRChallenge(@Param('deviceId') deviceId: string) {
		return this.quickResponseCodeService.generateQRChallenge(deviceId);
	}

	@Post('scan')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Login by scanning QR code' })
	@ApiResponse({ status: 200, description: 'QR code login successful' })
	@ApiResponse({ status: 400, description: 'Invalid QR code data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async scanLogin(@Body() dto: ScanLoginDto, @Request() req: any) {
		const fingerprint = this.fingerprintService.extractFingerprint(req, dto.deviceType);
		return this.quickResponseCodeService.scanLogin(dto, fingerprint);
	}
}
