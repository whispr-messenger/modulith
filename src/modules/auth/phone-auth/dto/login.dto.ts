import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SignalKeyBundleDto } from './signal-keys.dto';
import { DeviceInfo } from '../interfaces/device-info.interface';

export class LoginDto implements DeviceInfo {
    @IsUUID()
    verificationId: string;

    @IsOptional()
    @IsString()
    deviceName?: string;

    @IsOptional()
    @IsString()
    deviceType?: string;

    /**
     * Complete Signal Protocol key bundle
     * Contains identity key, signed prekey, and one-time prekeys
     * Required for devices that need end-to-end encryption
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => SignalKeyBundleDto)
    signalKeyBundle?: SignalKeyBundleDto;
}
