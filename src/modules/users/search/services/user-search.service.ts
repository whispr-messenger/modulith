import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../entities';
import { PrivacyService } from '../../privacy/privacy.service';
import { UserSearchResult, SearchOptions } from '../types';
import { UserSearchRepository } from '../user-search.repository';

@Injectable()
export class UserSearchService {
  private readonly logger = new Logger(UserSearchService.name);

  constructor(
    private userSearchRepository: UserSearchRepository,
    private privacyService: PrivacyService,
  ) {}

  /**
   * Search user by phone number
   */
  async searchByPhoneNumber(phoneNumber: string, options: SearchOptions = {}): Promise<UserSearchResult | null> {
    try {
      const user = await this.userSearchRepository.findByPhoneNumber(
        phoneNumber,
        options.includeInactive ?? false,
      );

      if (!user) {
        return null;
      }

      return await this.formatUserSearchResult(user, options.viewerId);
    } catch (error) {
      this.logger.error(`Failed to search by phone number ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Search user by username
   */
  async searchByUsername(username: string, options: SearchOptions = {}): Promise<UserSearchResult | null> {
    try {
      const user = await this.userSearchRepository.findByUsername(
        username,
        options.includeInactive ?? false,
      );

      if (!user) {
        return null;
      }

      return await this.formatUserSearchResult(user, options.viewerId);
    } catch (error) {
      this.logger.error(`Failed to search by username ${username}:`, error);
      throw error;
    }
  }

  /**
   * Format user search result with privacy filtering
   */
  private async formatUserSearchResult(
    user: User,
    viewerId?: string,
  ): Promise<UserSearchResult> {
    const canViewProfile = viewerId ? await this.privacyService.canViewProfilePicture(user.id, viewerId) : false;
    const canViewPhoneNumber = viewerId ? await this.privacyService.canViewProfilePicture(user.id, viewerId) : false; // Assuming same privacy level
    const canViewFirstName = viewerId ? await this.privacyService.canViewFirstName(user.id, viewerId) : false;
    const canViewLastName = viewerId ? await this.privacyService.canViewLastName(user.id, viewerId) : false;

    return {
      id: user.id,
      phoneNumber: canViewPhoneNumber ? user.phoneNumber : undefined,
      username: user.username,
      firstName: canViewFirstName ? (user.firstName || null) : 'Hidden',
      lastName: canViewLastName ? (user.lastName || null) : 'Hidden',
      profilePictureUrl: canViewProfile ? user.profilePictureUrl : undefined,
      isActive: user.isActive,
      canViewProfile,
      canViewPhoneNumber,
      canViewFirstName,
      canViewLastName,
    };
  }
}
