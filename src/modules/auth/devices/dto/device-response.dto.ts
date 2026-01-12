import { ApiProperty } from '@nestjs/swagger';

export class DeviceResponseDto {
	@ApiProperty({
		description: 'Device unique identifier',
		example: '550e8400-e29b-41d4-a716-446655440000',
		type: String,
	})
	id: string;

	@ApiProperty({
		description: 'Device name',
		example: 'Gonzalo iPhone',
		type: String,
	})
	deviceName: string;

	@ApiProperty({
		description: 'Device type',
		example: 'mobile',
		type: String,
	})
	deviceType: string;

	@ApiProperty({
		description: 'Device model',
		example: 'iPhone 15 Pro',
		type: String,
		required: false,
	})
	model?: string;

	@ApiProperty({
		description: 'Operating system version',
		example: 'iOS 17.2',
		type: String,
		required: false,
	})
	osVersion?: string;

	@ApiProperty({
		description: 'Application version',
		example: '1.0.0',
		type: String,
		required: false,
	})
	appVersion?: string;

	@ApiProperty({
		description: 'Last activity timestamp',
		example: '2026-01-08T10:30:00Z',
		type: String,
	})
	lastActive: Date;

	@ApiProperty({
		description: 'Device verification status',
		example: true,
		type: Boolean,
	})
	isVerified: boolean;

	@ApiProperty({
		description: 'Device active status',
		example: true,
		type: Boolean,
	})
	isActive: boolean;

	@ApiProperty({
		description: 'Device creation timestamp',
		example: '2026-01-01T10:00:00Z',
		type: String,
	})
	createdAt: Date;
}
