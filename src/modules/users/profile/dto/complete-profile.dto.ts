import { IsString, IsOptional, Length, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for completing a user's social profile
 * Used after initial registration to add optional profile information
 * The user must already exist (created via user.registered event)
 */
export class CompleteProfileDto {
  @ApiProperty({
    description: 'Username (unique)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Software developer passionate about technology',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  biography?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;
}
