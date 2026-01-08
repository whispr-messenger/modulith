import { IsUUID, IsString, IsOptional } from 'class-validator';


export class RegisterDto {
    @IsUUID()
    verificationId: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsOptional()
    @IsString()
    deviceName?: string;

    @IsOptional()
    @IsString()
    deviceType?: string;

    @IsOptional()
    @IsString()
    publicKey?: string;
}
