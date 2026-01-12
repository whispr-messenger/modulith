import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GroupProjection } from './entities/group-projection.entity';

@Injectable()
export class GroupProjectionService {
  private readonly logger = new Logger(GroupProjectionService.name);

  constructor(
    @InjectRepository(GroupProjection)
    private readonly groupProjectionRepo: Repository<GroupProjection>,
  ) {}

  async handleGroupCreated(event: any): Promise<void> {
    try {
      await this.groupProjectionRepo.save({
        groupId: event.groupId,
        name: event.name,
        pictureUrl: event.pictureUrl || null,
        isActive: true,
        memberCount: event.memberCount || 1,
        lastSyncedAt: new Date(),
      });
      this.logger.log(`Group projection created: ${event.groupId}`);
    } catch (error) {
      this.logger.error(`Failed to create group projection: ${error.message}`);
    }
  }

  async handleGroupUpdated(event: any): Promise<void> {
    try {
      const updateData: any = { lastSyncedAt: new Date() };
      
      if (event.name !== undefined) updateData.name = event.name;
      if (event.pictureUrl !== undefined) updateData.pictureUrl = event.pictureUrl;
      if (event.isActive !== undefined) updateData.isActive = event.isActive;

      const result = await this.groupProjectionRepo.update(
        { groupId: event.groupId },
        updateData,
      );

      if (result.affected === 0) {
        this.logger.warn(`Group projection not found for update: ${event.groupId}`);
      } else {
        this.logger.log(`Group projection updated: ${event.groupId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update group projection: ${error.message}`);
    }
  }

  async handleGroupMemberAdded(event: any): Promise<void> {
    try {
      await this.groupProjectionRepo.update(
        { groupId: event.groupId },
        { 
          memberCount: event.memberCount,
          lastSyncedAt: new Date(),
        },
      );
      this.logger.log(`Group projection member count updated: ${event.groupId} (${event.memberCount})`);
    } catch (error) {
      this.logger.error(`Failed to update group member count: ${error.message}`);
    }
  }

  async handleGroupMemberRemoved(event: any): Promise<void> {
    try {
      await this.groupProjectionRepo.update(
        { groupId: event.groupId },
        { 
          memberCount: event.memberCount,
          lastSyncedAt: new Date(),
        },
      );
      this.logger.log(`Group projection member count updated: ${event.groupId} (${event.memberCount})`);
    } catch (error) {
      this.logger.error(`Failed to update group member count: ${error.message}`);
    }
  }

  async getGroupProjection(groupId: string): Promise<GroupProjection | null> {
    return this.groupProjectionRepo.findOne({ where: { groupId } });
  }

  async getGroupProjections(groupIds: string[]): Promise<GroupProjection[]> {
    return this.groupProjectionRepo.find({ 
      where: { groupId: In(groupIds), isActive: true } 
    });
  }
}
