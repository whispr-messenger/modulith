import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerificationConfirmDto, VerificationRequestDto, VerificationRequestResponseDto } from '../dto';
import { PhoneVerificationService } from '../services';
import { VERIFICATION_CONFIRM_EXAMPLES, VERIFICATION_REQUEST_EXAMPLES } from '../swagger/phone-verification.examples';

@Controller('verify')
export class PhoneVerificationController {
	constructor(private readonly phoneVerificationService: PhoneVerificationService) {}

	@Post('register/request')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Request registration verification code' })
	@ApiBody({ type: VerificationRequestDto, examples: VERIFICATION_REQUEST_EXAMPLES })
	@ApiResponse({ status: 200, description: 'Verification code sent successfully' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	@ApiResponse({ status: 429, description: 'Too many requests' })
	async requestRegistrationVerification(@Body() dto: VerificationRequestDto) {
		return this.phoneVerificationService.requestRegistrationVerification(dto);
	}

	@Post('register/confirm')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Confirm registration verification code' })
	@ApiBody({ type: VerificationConfirmDto, examples: VERIFICATION_CONFIRM_EXAMPLES })
	@ApiResponse({ status: 200, description: 'Verification code confirmed' })
	@ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
	async confirmRegistrationVerification(@Body() dto: VerificationConfirmDto) {
		return this.phoneVerificationService.confirmRegistrationVerification(dto);
	}

	@Post('login/request')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Request login verification code' })
	@ApiBody({ type: VerificationRequestDto, examples: VERIFICATION_REQUEST_EXAMPLES })
	@ApiResponse({ status: 200, description: 'Verification code sent successfully' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	@ApiResponse({ status: 429, description: 'Too many requests' })
	async requestLoginVerification(
		@Body() dto: VerificationRequestDto
	): Promise<VerificationRequestResponseDto> {
		return this.phoneVerificationService.requestLoginVerification(dto);
	}

	@Post('login/confirm')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Confirm login verification code' })
	@ApiBody({ type: VerificationConfirmDto, examples: VERIFICATION_CONFIRM_EXAMPLES })
	@ApiResponse({ status: 200, description: 'Verification code confirmed' })
	@ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
	async confirmLoginVerification(@Body() dto: VerificationConfirmDto) {
		return this.phoneVerificationService.confirmLoginVerification(dto);
	}
}
