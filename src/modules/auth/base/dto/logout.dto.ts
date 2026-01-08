import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: "Identifiant de l'appareil à déconnecter", required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ description: "Identifiant de l'utilisateur", required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
