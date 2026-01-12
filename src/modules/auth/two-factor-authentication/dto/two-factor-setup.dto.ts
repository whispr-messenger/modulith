import { IsString, Length } from 'class-validator';


export class TwoFactorSetupDto {
    @IsString()
    secret: string;

    @IsString()
    @Length(6, 6)
    token: string;
}
