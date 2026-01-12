import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GroupProjectionService } from './group-projection.service';

@Controller()
export class GroupProjectionController {
  private readonly logger = new Logger(GroupProjectionController.name);

  constructor(
    private readonly groupProjectionService: GroupProjectionService,
  ) {}

  @MessagePattern('group.created')
  async handleGroupCreated(@Payload() data: any) {
    this.logger.debug(`Received group.created event: ${JSON.stringify(data)}`);
    await this.groupProjectionService.handleGroupCreated(data);
  }

  @MessagePattern('group.updated')
  async handleGroupUpdated(@Payload() data: any) {
    this.logger.debug(`Received group.updated event: ${JSON.stringify(data)}`);
    await this.groupProjectionService.handleGroupUpdated(data);
  }

  @MessagePattern('group.member_added')
  async handleGroupMemberAdded(@Payload() data: any) {
    this.logger.debug(`Received group.member_added event: ${JSON.stringify(data)}`);
    await this.groupProjectionService.handleGroupMemberAdded(data);
  }

  @MessagePattern('group.member_removed')
  async handleGroupMemberRemoved(@Payload() data: any) {
    this.logger.debug(`Received group.member_removed event: ${JSON.stringify(data)}`);
    await this.groupProjectionService.handleGroupMemberRemoved(data);
  }
}
