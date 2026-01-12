import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '../../entities';
import { CompleteProfileDto, UpdateProfileDto } from '../dto';
import { UserSearchIndexService } from '../../search/services/user-search-index.service';
import { UserRepository } from '../../common/repositories';
import { UserUpdatedEvent } from '../../accounts/events';

/**
 * ProfileService - Manages user social profile information
 * 
 * Responsibilities:
 * - Complete user profile after registration (username, names, bio, avatar)
 * - Update profile information
 * - Coordinate with search indexing when profile changes
 * 
 * Separated from UsersService which handles:
 * - Identity management (phone number)
 * - Lifecycle (activation, deactivation, deletion)
 * - Activity tracking (last seen)
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSearchIndexService: UserSearchIndexService,
    @Inject('EVENTS_SERVICE')
    private readonly eventsClient: ClientProxy,
  ) { }

  /**
   * Complete user profile with social information
   * This is called after the user has been created via event projection
   * Requires username and firstName as minimum, other fields are optional
   * 
   * IMPORTANT: This is where the search index is created for the first time
   * with complete user data, making the user searchable by username and name.
   */
  async completeProfile(userId: string, dto: CompleteProfileDto): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if profile is already completed
    if (user.username) {
      throw new BadRequestException('Profile already completed. Use update endpoint to modify profile.');
    }

    // Check if username is already taken
    const existingUserByUsername = await this.userRepository.findByUsername(dto.username);

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // Update user with profile data
    Object.assign(user, dto);
    const updatedUser: User = await this.userRepository.save(user);

    // Create search index now that profile is complete
    // This is the only indexation point - user becomes searchable here
    await this.userSearchIndexService.updateSearchIndex(userId, {
      phoneNumber: user.phoneNumber, // Obligatory field from initial creation
      username: dto.username,         // Obligatory field from profile completion
      firstName: dto.firstName,       // Obligatory field from profile completion
      lastName: dto.lastName,         // Optional field
    });

    // Publish user.updated event for projections (profile completed)
    this.eventsClient.emit('user.updated', new UserUpdatedEvent(
      userId,
      dto.username,
      dto.firstName,
      dto.lastName,
      dto.profilePictureUrl,
      true, // isActive
    ));

    return updatedUser;
  }

  /**
   * Update user profile information
   * Can update username, names, biography, and profile picture
   * Coordinates with search index when searchable fields change
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (dto.username && dto.username !== user.username) {
      const existingUser = await this.userRepository.findByUsername(dto.username);
      if (existingUser) {
        throw new ConflictException('Username already exists');
      }
    }

    // Update user with profile data
    Object.assign(user, dto);
    const updatedUser = await this.userRepository.save(user);

    // Update search index if any searchable field changed
    if (
      dto.username ||
      dto.firstName ||
      dto.lastName !== undefined
    ) {
      await this.userSearchIndexService.updateSearchIndex(userId, {
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    }

    // Publish user.updated event for projections
    this.eventsClient.emit('user.updated', new UserUpdatedEvent(
      userId,
      dto.username,
      dto.firstName,
      dto.lastName,
      dto.profilePictureUrl,
      undefined, // isActive not changed
    ));

    return updatedUser;
  }

  /**
   * Get user profile by ID
   * Returns user with privacy settings relation loaded
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId, ['privacySettings']);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
