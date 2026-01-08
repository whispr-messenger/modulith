import { Module } from "@nestjs/common";
import { PhoneAuthenticationModule } from "./phone-auth/phone-authentication.module";
import { DevicesModule } from "./devices/devices.module";
import { PhoneVerificationModule } from "./phone-verification/phone-verification.module";
import { TokensModule } from "./tokens/tokens.module";
import { TwoFactorAuthenticationModule } from "./two-factor-authentication/two-factor-authentication.module";
import { SignalModule } from "./signal/signal.module";

@Module({
    providers: [],
    imports: [
        SignalModule,
        PhoneAuthenticationModule,
        DevicesModule,
        PhoneVerificationModule,
        TokensModule,
        TwoFactorAuthenticationModule
    ],
})
export class AuthModule { }