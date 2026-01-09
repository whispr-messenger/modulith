import { Body, Controller, Get, HttpCode, HttpStatus, Request, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TwoFactorSetupDto } from '../../common/dto/two-factor-setup.dto';
import { TwoFactorVerifyDto } from '../../common/dto/two-factor-verify.dto';
import { JwtAuthGuard } from '../../base/guards';
import { TwoFactorAuthenticationService } from '../services/two-factor-authentication.service';

@Controller('2fa')
export class TwoFactorAuthenticationController {
	constructor(private readonly twoFactorService: TwoFactorAuthenticationService) { }

	@Post('setup')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Setup two-factor authentication (2FA)' })
	@ApiResponse({ status: 200, description: 'Returns QR code and secret for 2FA setup' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async setupTwoFactor(@Request() req: any): Promise<any> {
		return this.twoFactorService.setupTwoFactor(req.user.sub);
	}

	@Post('enable')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Enable two-factor authentication' })
	@ApiResponse({
		status: 200,
		description: '2FA enabled successfully with backup codes',
	})
	@ApiResponse({ status: 400, description: 'Invalid token or secret' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async enableTwoFactor(@Request() req: any, @Body() dto: TwoFactorSetupDto) {
		return this.twoFactorService.enableTwoFactor(req.user.sub, dto.secret, dto.token);
	}

	@Post('verify')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Verify two-factor authentication token' })
	@ApiResponse({ status: 200, description: 'Token verification result' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async verifyTwoFactor(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
		const isValid = await this.twoFactorService.verifyTwoFactor(req.user.sub, dto.token);
		return { valid: isValid };
	}

	@Post('disable')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Disable two-factor authentication' })
	@ApiResponse({ status: 200, description: '2FA disabled successfully' })
	@ApiResponse({ status: 400, description: 'Invalid token' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async disableTwoFactor(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
		await this.twoFactorService.disableTwoFactor(req.user.sub, dto.token);
		return { disabled: true };
	}

	@Post('backup-codes')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Generate new 2FA backup codes' })
	@ApiResponse({ status: 200, description: 'New backup codes generated' })
	@ApiResponse({ status: 400, description: 'Invalid token' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async generateBackupCodes(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
		const codes = await this.twoFactorService.generateNewBackupCodes(req.user.sub, dto.token);
		return { backupCodes: codes };
	}

	@Get('status')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get two-factor authentication status' })
	@ApiResponse({ status: 200, description: 'Returns 2FA enabled status' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getTwoFactorStatus(@Request() req: any) {
		const enabled = await this.twoFactorService.isTwoFactorEnabled(req.user.sub);
		return { enabled };
	}
}
