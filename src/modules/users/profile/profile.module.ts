import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';
import { UserSearchModule } from '../search/user-search.module';
import { User } from '../common/entities/user.entity';
import { CommonModule } from '../common/common.module';

/**
 * ProfileModule - Manages user social profile features
 * 
 * This module handles:
 * - Profile completion after registration
 * - Profile updates (username, names, bio, avatar)
 * - Profile retrieval
 * - Search index coordination for profile changes
 * 
 * Separated from core UsersModule which handles:
 * - User identity and lifecycle
 * - Activity tracking
 * - Account status management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UserSearchModule,
    CommonModule,
    // Event bus configuration for publishing user profile events
    ClientsModule.registerAsync([
      {
        name: 'EVENTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule { }
