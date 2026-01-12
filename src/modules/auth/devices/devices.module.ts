import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// QR Codes
import { QuickResponseCodeService } from './quick-response-code/services';
import { QuickResponseCodeController } from './quick-response-code/controller/quick-response-code.controller';
// Devices
import { Device } from './entities/device.entity';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceRegistrationService, DeviceActivityService, DeviceStatsService, DeviceFingerprintService, DevicesService } from './services';
import { DevicesController } from './controllers/devices.controller';
// Others
import { TokensModule } from '../tokens/tokens.module';
import { UserAuth } from '../common/entities/user-auth.entity';

@Module({
	providers: [
		DevicesService,
		DeviceRegistrationService,
		DeviceActivityService,
		DeviceStatsService,
		DeviceFingerprintService,
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
		DeviceFingerprintService,
		QuickResponseCodeService,
	],
})
export class DevicesModule { }
