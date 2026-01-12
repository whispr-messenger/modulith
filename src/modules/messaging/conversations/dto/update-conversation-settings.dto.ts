import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Partial notification settings for updates
 */
export class UpdateNotificationSettings {
  @ApiPropertyOptional({
    description: 'Enable/disable notifications for this conversation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable sound for notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  sound?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable vibration for notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  vibrate?: boolean;

  @ApiPropertyOptional({
    description: 'Show message preview in notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showPreview?: boolean;
}

/**
 * Partial privacy settings for updates
 */
export class UpdatePrivacySettings {
  @ApiPropertyOptional({
    description: 'Show typing indicator',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showTyping?: boolean;

  @ApiPropertyOptional({
    description: 'Show read receipts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showReadReceipts?: boolean;

  @ApiPropertyOptional({
    description: 'Show online status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;
}

/**
 * DTO for updating conversation settings (partial update)
 */
export class UpdateConversationSettingsDto {
  @ApiPropertyOptional({
    description: 'Notification settings for the conversation',
    type: UpdateNotificationSettings,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNotificationSettings)
  notifications?: UpdateNotificationSettings;

  @ApiPropertyOptional({
    description: 'Privacy settings for the conversation',
    type: UpdatePrivacySettings,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePrivacySettings)
  privacy?: UpdatePrivacySettings;

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
