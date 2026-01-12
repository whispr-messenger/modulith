import { IsString, IsOptional, Length, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a user's profile information
 * All fields are optional - only provided fields will be updated
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Username (unique)',
    example: 'john_doe_updated',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  username?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

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
    example: 'Updated biography',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  biography?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/new-profile.jpg',
  })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;
}
