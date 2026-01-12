import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupProjection } from './entities/group-projection.entity';
import { GroupProjectionService } from './group-projection.service';
import { GroupProjectionController } from './group-projection.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupProjection]),
  ],
  controllers: [GroupProjectionController],
  providers: [GroupProjectionService],
  exports: [GroupProjectionService],
})
export class GroupProjectionModule {}
