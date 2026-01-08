import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a Signal Protocol Key Bundle
 * Contains all public keys needed to initiate an encrypted session with a user
 */
export class SignedPreKeyResponseDto {
	@ApiProperty({
		description: 'Unique identifier for this signed prekey',
		example: 1,
	})
	keyId: number;

	@ApiProperty({
		description: 'Base64-encoded public key',
		example: 'BQXm8...abc123',
	})
	publicKey: string;

	@ApiProperty({
		description: 'Base64-encoded signature of the public key',
		example: 'SGVsbG8...xyz789',
	})
	signature: string;
}

/**
 * One-time prekey response
 */
export class PreKeyResponseDto {
	@ApiProperty({
		description: 'Unique identifier for this prekey',
		example: 42,
	})
	keyId: number;

	@ApiProperty({
		description: 'Base64-encoded public key',
		example: 'BZrt9...def456',
	})
	publicKey: string;
}

/**
 * Complete key bundle for X3DH key exchange
 */
export class KeyBundleResponseDto {
	@ApiProperty({
		description: 'User ID who owns these keys',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	userId: string;

	@ApiPropertyOptional({
		description: 'Device ID if requesting for a specific device',
		example: '987fcdeb-51a2-43f7-9c8d-123456789abc',
	})
	deviceId?: string;

	@ApiProperty({
		description: "User's long-term identity key (base64-encoded public key)",
		example: 'BRjK5...ghi789',
	})
	identityKey: string;

	@ApiProperty({
		description: 'Current signed prekey with signature',
		type: SignedPreKeyResponseDto,
	})
	signedPreKey: SignedPreKeyResponseDto;

	@ApiPropertyOptional({
		description: 'One-time prekey (optional if all prekeys are consumed)',
		type: PreKeyResponseDto,
	})
	preKey?: PreKeyResponseDto;
}
