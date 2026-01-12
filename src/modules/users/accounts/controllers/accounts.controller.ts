import { Controller, Get, Patch, Param, Delete, Query, ParseUUIDPipe, ParseIntPipe, HttpStatus, Logger, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_REGISTERED_PATTERN, type UserRegisteredEvent } from 'src/modules/shared/events';

/**
 * UsersController - Manages core user identity and lifecycle endpoints
 * 
 * Handles:
 * - User listing and retrieval
 * - Activity tracking (last seen)
 * - Account status (activation, deactivation)
 * - Account deletion
 * 
 * Profile management is handled by ProfileController
 */
@ApiTags('User - Accounts')
@ApiBearerAuth()
@Controller('user/account')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(private readonly usersService: AccountsService) { }

  /**
   * Handles user.registered event from auth module
   * Creates a minimal user record in the users schema
   * This allows the auth module to create users without depending on the users module
   */
  @MessagePattern(USER_REGISTERED_PATTERN)
  async createUserAccount(@Payload() event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Received ${USER_REGISTERED_PATTERN} event for user ${event.userId}`);

    try {
      const user = await this.usersService.createFromEvent(event);
      this.logger.log(`Successfully created user projection for ${user.id} (${user.phoneNumber})`);
    } catch (error) {
      this.logger.error(`Failed to create user projection for ${event.userId}: ${error.message}`, error.stack);
      // Don't throw - we don't want to block the auth module
      // The event can be retried or handled via a dead letter queue
    }
  }

  @Patch(':id/last-seen')
  @ApiOperation({ summary: 'Update user last seen timestamp' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Last seen updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async updateLastSeen(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.updateLastSeen(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User deactivated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User activated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
