import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './controllers/devices.controller';
import { DevicesService } from './devices.service';
import { QuickResponseCodeService } from './quick-response-code/quick-response-code.service';
import { QuickResponseCodeController } from './quick-response-code/quick-response-code.controller';
import { TokensModule } from '../tokens/tokens.module';
import { Device } from './device.entity';
import { UserAuth } from '../common/entities/user-auth.entity';

@Module({
	providers: [DevicesService, QuickResponseCodeService],
	controllers: [DevicesController, QuickResponseCodeController],
	imports: [TypeOrmModule.forFeature([Device, UserAuth]), TokensModule],
	exports: [DevicesService, QuickResponseCodeService],
})
export class DevicesModule {}
