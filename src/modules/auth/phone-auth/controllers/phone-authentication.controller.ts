import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PhoneAuthenticationService } from '../services/phone-authentication.service';
import { JwtAuthGuard } from '../../tokens/guards';
import { DeviceFingerprintService } from '../../devices/services/device-fingerprint/device-fingerprint.service';
import { RegisterDto, LoginDto, LogoutDto, RegisterResponseDto, LoginResponseDto } from '../dto';
import { REGISTER_EXAMPLES, LOGIN_EXAMPLES, LOGOUT_EXAMPLES } from '../swagger/phone-authentication.examples';

@ApiTags('Phone Authentication')
@Controller()
export class PhoneAuthenticationController {

	constructor(
		private readonly authService: PhoneAuthenticationService,
		private readonly fingerprintService: DeviceFingerprintService,
	) { }

	@Post('register')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Register a new user account' })
	@ApiResponse({ status: 201, description: 'User successfully registered', type: RegisterResponseDto })
	@ApiResponse({ status: 400, description: 'Invalid registration data' })
	@ApiResponse({ status: 409, description: 'User already exists' })
	@ApiBody({ type: RegisterDto, examples: REGISTER_EXAMPLES, })
	async register(@Body() dto: RegisterDto, @Request() req: any): Promise<RegisterResponseDto> {
		const fingerprint = this.fingerprintService.extractFingerprint(req, dto.deviceType);
		return this.authService.register(dto, fingerprint);
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Login to user account' })
	@ApiResponse({
		status: 200,
		description: 'Login successful, returns access and refresh tokens',
		type: LoginResponseDto,
	})
	@ApiResponse({ status: 401, description: 'Invalid credentials' })
	@ApiResponse({ status: 403, description: '2FA verification required' })
	@ApiBody({
		type: LoginDto,
		examples: LOGIN_EXAMPLES,
	})
	async login(@Body() dto: LoginDto, @Request() req: any): Promise<LoginResponseDto> {
		const fingerprint = this.fingerprintService.extractFingerprint(req, dto.deviceType);
		return this.authService.login(dto, fingerprint);
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Logout and invalidate current session' })
	@ApiResponse({ status: 204, description: 'Successfully logged out' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiBody({
		type: LogoutDto,
		examples: LOGOUT_EXAMPLES,
	})
	async logout(@Body() dto: LogoutDto, @Request() req: any) {
		return this.authService.logout(dto.userId ?? req.user.sub, dto.deviceId ?? req.user.deviceId);
	}
}
