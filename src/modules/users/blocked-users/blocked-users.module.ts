import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedUsersService } from './blocked-users.service';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUser } from './blocked-user.entity';
import { Contact } from '../contacts/contact.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedUser, Contact]),
    CommonModule,
  ],
  controllers: [BlockedUsersController],
  providers: [BlockedUsersService],
  exports: [BlockedUsersService],
})
export class BlockedUsersModule { }
