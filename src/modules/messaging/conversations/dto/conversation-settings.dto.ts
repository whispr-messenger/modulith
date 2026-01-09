import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Notification settings for a conversation
 */
export class NotificationSettings {
  @ApiProperty({
    description: 'Enable/disable notifications for this conversation',
    default: true,
    example: true,
  })
  @IsBoolean()
  enabled: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable/disable sound for notifications',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  sound?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable/disable vibration for notifications',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  vibrate?: boolean = true;

  @ApiPropertyOptional({
    description: 'Show message preview in notifications',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showPreview?: boolean = true;
}

/**
 * Privacy settings for a conversation
 */
export class PrivacySettings {
  @ApiPropertyOptional({
    description: 'Show typing indicator',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTyping?: boolean = true;

  @ApiPropertyOptional({
    description: 'Show read receipts',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showReadReceipts?: boolean = true;

  @ApiPropertyOptional({
    description: 'Show online status',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean = true;
}

/**
 * DTO for conversation settings
 */
export class ConversationSettingsDto {
  @ApiProperty({
    description: 'Notification settings for the conversation',
    type: NotificationSettings,
  })
  @ValidateNested()
  @Type(() => NotificationSettings)
  notifications: NotificationSettings;

  @ApiProperty({
    description: 'Privacy settings for the conversation',
    type: PrivacySettings,
  })
  @ValidateNested()
  @Type(() => PrivacySettings)
  privacy: PrivacySettings;

  @ApiPropertyOptional({
    description: 'Custom nickname for the conversation',
    example: 'Work Team',
  })
  @IsOptional()
  @IsString()
  customNickname?: string;

  @ApiPropertyOptional({
    description: 'Custom theme or color for the conversation',
    example: '#FF5733',
  })
  @IsOptional()
  @IsString()
  theme?: string;
}
