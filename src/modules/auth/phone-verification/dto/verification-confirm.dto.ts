import { IsUUID, IsString, Length } from 'class-validator';


export class VerificationConfirmDto {
    @IsUUID()
    verificationId: string;

    @IsString()
    @Length(6, 6)
    code: string;
}
