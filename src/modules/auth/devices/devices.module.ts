import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './controllers/devices.controller';
import { DevicesService } from './services/devices.service';
import { DeviceRegistrationService } from './services/device-registration.service';
import { DeviceActivityService } from './services/device-activity.service';
import { DeviceStatsService } from './services/device-stats.service';
import { DeviceRepository } from './repositories/device.repository';
import { QuickResponseCodeService } from './quick-response-code/quick-response-code.service';
import { QuickResponseCodeController } from './quick-response-code/quick-response-code.controller';
import { TokensModule } from '../tokens/tokens.module';
import { Device } from './entities/device.entity';
import { UserAuth } from '../common/entities/user-auth.entity';

@Module({
	providers: [
		DevicesService,
		DeviceRegistrationService,
		DeviceActivityService,
		DeviceStatsService,
		DeviceRepository,
		QuickResponseCodeService,
	],
	controllers: [DevicesController, QuickResponseCodeController],
	imports: [TypeOrmModule.forFeature([Device, UserAuth]), TokensModule],
	exports: [
		DevicesService,
		DeviceRegistrationService,
		DeviceActivityService,
		DeviceStatsService,
		QuickResponseCodeService,
	],
})
export class DevicesModule { }
