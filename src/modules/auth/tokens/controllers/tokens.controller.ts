import { Body, Controller, HttpCode, HttpStatus, Request, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeviceFingerprint } from '../../devices/types/device-fingerprint.interface';
import { TokensService } from '../services/tokens.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@Controller('tokens')
export class TokensController {
	constructor(private readonly tokensService: TokensService) {}

	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Refresh access token using refresh token' })
	@ApiResponse({ status: 200, description: 'Token refreshed successfully' })
	@ApiResponse({
		status: 401,
		description: 'Invalid or expired refresh token',
	})
	async refreshToken(@Body() dto: RefreshTokenDto, @Request() req: any) {
		const fingerprint: DeviceFingerprint = {
			userAgent: req.headers['user-agent'],
			ipAddress: req.ip,
			deviceType: 'unknown',
			timestamp: Date.now(),
		};

		return this.tokensService.refreshAccessToken(dto.refreshToken, fingerprint);
	}
}