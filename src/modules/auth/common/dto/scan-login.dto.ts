import { IsString, IsUUID, IsOptional } from 'class-validator';


export class ScanLoginDto {
    @IsString()
    challenge: string;

    @IsUUID()
    authenticatedDeviceId: string;

    @IsOptional()
    @IsString()
    deviceName?: string;

    @IsOptional()
    @IsString()
    deviceType?: string;
}
