import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';
import { PrivacySettings } from './privacy-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrivacySettings])],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule { }
