import { Module } from "@nestjs/common";
import { BaseAuthenticationModule } from "./base/base-authentication.module";
import { DevicesModule } from "./devices/devices.module";
import { PhoneVerificationModule } from "./phone-verification/phone-verification.module";
import { TokensModule } from "./tokens/tokens.module";
import { TwoFactorAuthenticationModule } from "./two-factor-authentication/two-factor-authentication.module";

@Module({
    providers: [],
    imports: [
        BaseAuthenticationModule,
        DevicesModule,
        PhoneVerificationModule,
        TokensModule,
        TwoFactorAuthenticationModule
    ],
})
export class AuthModule { }