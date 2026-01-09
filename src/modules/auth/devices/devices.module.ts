import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './controllers/devices.controller';
import { DevicesService } from './services/devices.service';
import { QuickResponseCodeService } from './quick-response-code/quick-response-code.service';
import { QuickResponseCodeController } from './quick-response-code/quick-response-code.controller';
import { TokensModule } from '../tokens/tokens.module';
import { Device } from './entities/device.entity';
import { UserAuth } from '../common/entities/user-auth.entity';

@Module({
	providers: [DevicesService, QuickResponseCodeService],
	controllers: [DevicesController, QuickResponseCodeController],
	imports: [TypeOrmModule.forFeature([Device, UserAuth]), TokensModule, CacheModule.register()],
	exports: [DevicesService, QuickResponseCodeService],
})
export class DevicesModule { }
