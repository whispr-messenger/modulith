import {  IsPhoneNumber } from 'class-validator';

export class VerificationRequestDto {
    @IsPhoneNumber()
    phoneNumber: string;
}
