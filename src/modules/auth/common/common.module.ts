import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAuthService } from './services/user-auth.service';
import { UserAuth } from './entities/user-auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAuth])],
  providers: [UserAuthService],
  exports: [UserAuthService],
})
export class CommonModule {}
