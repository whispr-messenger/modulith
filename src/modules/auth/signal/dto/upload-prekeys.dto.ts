import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PreKeyDto } from './signal-keys.dto';

/**
 * DTO for uploading multiple prekeys
 */
export class UploadPreKeysDto {
	@ApiProperty({
		description: 'Array of prekeys to upload',
		type: [PreKeyDto],
		example: [
			{ keyId: 1, publicKey: 'BZrt9...def456' },
			{ keyId: 2, publicKey: 'BXmn4...ghi789' },
		],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PreKeyDto)
	preKeys: PreKeyDto[];
}
