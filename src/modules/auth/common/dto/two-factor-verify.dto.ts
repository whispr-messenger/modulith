import { IsString, Length } from 'class-validator';


export class TwoFactorVerifyDto {
    @IsString()
    @Length(6, 6)
    token: string;
}
