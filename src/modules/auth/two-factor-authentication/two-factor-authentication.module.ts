import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorAuthenticationController } from './controllers/two-factor-authentication.controller';
import { TwoFactorAuthenticationService } from './services/two-factor-authentication.service';
import { BackupCodesService } from './backup-codes/backup-codes.service';
import { UserAuth } from '../common/entities/user-auth.entity';
import { BackupCode } from './entities/backup-code.entity';
import { TokensModule } from '../tokens/tokens.module';
import { JwtAuthGuard } from '../tokens/guards/jwt-auth.guard';
import { CommonModule } from '../common/common.module';

@Module({
	providers: [TwoFactorAuthenticationService, BackupCodesService, JwtAuthGuard],
	controllers: [TwoFactorAuthenticationController],
	imports: [TypeOrmModule.forFeature([UserAuth, BackupCode]), TokensModule, CommonModule],
	exports: [BackupCodesService],
})
export class TwoFactorAuthenticationModule { }
