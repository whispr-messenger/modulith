import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
	@ApiProperty({
		description: 'JWT access token for authentication',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	accessToken: string;

	@ApiProperty({
		description: 'JWT refresh token for obtaining new access tokens',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	refreshToken: string;
}
