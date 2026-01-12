import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserProjectionService } from './user-projection.service';

@Controller()
export class UserProjectionController {
  private readonly logger = new Logger(UserProjectionController.name);

  constructor(
    private readonly userProjectionService: UserProjectionService,
  ) {}

  @MessagePattern('user.created')
  async handleUserCreated(@Payload() data: any) {
    this.logger.debug(`Received user.created event: ${JSON.stringify(data)}`);
    await this.userProjectionService.handleUserCreated(data);
  }

  @MessagePattern('user.updated')
  async handleUserUpdated(@Payload() data: any) {
    this.logger.debug(`Received user.updated event: ${JSON.stringify(data)}`);
    await this.userProjectionService.handleUserUpdated(data);
  }

  @MessagePattern('user.deactivated')
  async handleUserDeactivated(@Payload() data: any) {
    this.logger.debug(`Received user.deactivated event: ${JSON.stringify(data)}`);
    await this.userProjectionService.handleUserDeactivated(data);
  }
}
