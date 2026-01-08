import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single PreKey (one-time use key)
 */
export class PreKeyDto {
    @IsNumber()
    keyId: number;

    @IsString()
    publicKey: string;
}

/**
 * DTO for a Signed PreKey
 */
export class SignedPreKeyDto {
    @IsNumber()
    keyId: number;

    @IsString()
    publicKey: string;

    @IsString()
    signature: string;
}

/**
 * Complete Signal Protocol Key Bundle
 * Contains all cryptographic keys needed for X3DH key exchange
 */
export class SignalKeyBundleDto {
    /**
     * Device's long-term identity key (public part)
     * This key identifies the device uniquely in the Signal protocol
     */
    @IsString()
    identityKey: string;

    /**
     * Current signed prekey with signature
     * Used for forward secrecy and authenticated key exchange
     */
    @ValidateNested()
    @Type(() => SignedPreKeyDto)
    signedPreKey: SignedPreKeyDto;

    /**
     * Batch of one-time prekeys (typically 100 keys)
     * Each key can only be used once for initiating a session
     */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PreKeyDto)
    preKeys: PreKeyDto[];
}
