import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProjection } from './entities/user-projection.entity';
import { UserProjectionService } from './user-projection.service';
import { UserProjectionController } from './user-projection.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProjection]),
  ],
  controllers: [UserProjectionController],
  providers: [UserProjectionService],
  exports: [UserProjectionService],
})
export class UserProjectionModule {}
