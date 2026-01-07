import { Module } from '@nestjs/common';
import { HealthController } from './heatlh.controller';

@Module({
	controllers: [HealthController],
})
export class HealthModule {}