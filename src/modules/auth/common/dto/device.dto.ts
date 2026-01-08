import { IsString, IsPhoneNumber, IsOptional } from 'class-validator';

export class DeviceDto {
    @IsString()
    deviceName: string;

    @IsString()
    deviceType: string;

    @IsString()
    publicKey: string;

    @IsOptional()
    @IsString()
    fcmToken?: string;
}