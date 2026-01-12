import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserProjection } from './entities/user-projection.entity';

@Injectable()
export class UserProjectionService {
  private readonly logger = new Logger(UserProjectionService.name);

  constructor(
    @InjectRepository(UserProjection)
    private readonly userProjectionRepo: Repository<UserProjection>,
  ) {}

  async handleUserCreated(event: any): Promise<void> {
    try {
      await this.userProjectionRepo.save({
        userId: event.userId,
        username: event.username,
        firstName: event.firstName || null,
        lastName: event.lastName || null,
        profilePictureUrl: null,
        isActive: true,
        lastSyncedAt: new Date(),
      });
      this.logger.log(`User projection created: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to create user projection: ${error.message}`);
    }
  }

  async handleUserUpdated(event: any): Promise<void> {
    try {
      const updateData: any = { lastSyncedAt: new Date() };
      
      if (event.username !== undefined) updateData.username = event.username;
      if (event.firstName !== undefined) updateData.firstName = event.firstName;
      if (event.lastName !== undefined) updateData.lastName = event.lastName;
      if (event.profilePictureUrl !== undefined) updateData.profilePictureUrl = event.profilePictureUrl;
      if (event.isActive !== undefined) updateData.isActive = event.isActive;

      const result = await this.userProjectionRepo.update(
        { userId: event.userId },
        updateData,
      );

      if (result.affected === 0) {
        this.logger.warn(`User projection not found for update: ${event.userId}`);
      } else {
        this.logger.log(`User projection updated: ${event.userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update user projection: ${error.message}`);
    }
  }

  async handleUserDeactivated(event: any): Promise<void> {
    try {
      await this.userProjectionRepo.update(
        { userId: event.userId },
        { 
          isActive: false,
          lastSyncedAt: new Date(),
        },
      );
      this.logger.log(`User projection deactivated: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate user projection: ${error.message}`);
    }
  }

  async getUserProjection(userId: string): Promise<UserProjection | null> {
    return this.userProjectionRepo.findOne({ where: { userId } });
  }

  async getUserProjections(userIds: string[]): Promise<UserProjection[]> {
    return this.userProjectionRepo.find({ 
      where: { userId: In(userIds), isActive: true } 
    });
  }
}
