import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserSearchIndex } from '../entities/user-search-index.entity';
import { SearchIndexService } from '../../cache';
import { UserRepository } from '../../common/repositories';

@Injectable()
export class UserSearchIndexService {
  private readonly logger = new Logger(UserSearchIndexService.name);

  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(UserSearchIndex)
    private userSearchIndexRepository: Repository<UserSearchIndex>,
    private searchIndexService: SearchIndexService,
  ) {}

  private hashPhoneNumber(phoneNumber: string): string {
    return crypto.createHash('sha256').update(phoneNumber).digest('hex');
  }

  /**
   * Update or create search index for a user
   * 
   * INDEXATION STRATEGY:
   * - Index is created ONLY during completeProfile() with all required fields
   * - At that point we have: phoneNumber (from registration) + username + firstName (from profile)
   * - User becomes searchable only after profile completion
   * - Subsequent updates use this method to refresh the index
   * 
   * Required: At least phoneNumber AND username should be provided for initial indexing.
   * 
   * @param userId - The user ID to index
   * @param data - The searchable user data (phoneNumber, username, firstName, lastName)
   * @throws {Error} If critical indexing fails
   */
  async updateSearchIndex(
    userId: string,
    data: {
      username?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
    },
  ): Promise<void> {
    // Log warning if trying to index without any searchable field
    if (!data.phoneNumber && !data.username) {
      this.logger.warn(
        `Attempting to update search index for user ${userId} without phoneNumber or username. ` +
          `User may not be searchable. Provide at least phoneNumber (initial creation) or username (profile completion).`,
      );
    }

    const searchIndex = await this.userSearchIndexRepository.findOne({
      where: { userId },
    });

    if (searchIndex) {
      // Update existing search index
      if (data.username !== undefined) {
        searchIndex.usernameNormalized = data.username.toLowerCase();
      }
      if (data.firstName !== undefined) {
        searchIndex.firstNameNormalized = data.firstName.toLowerCase();
      }
      if (data.lastName !== undefined) {
        searchIndex.lastNameNormalized = data.lastName?.toLowerCase() || '';
      }
      if (data.phoneNumber !== undefined) {
        searchIndex.phoneNumberHash = this.hashPhoneNumber(data.phoneNumber);
      }
      await this.userSearchIndexRepository.save(searchIndex);

      this.logger.debug(`Search index updated for user ${userId}`);
    } else {
      // Create new search index
      const newSearchIndex = this.userSearchIndexRepository.create({
        userId,
        usernameNormalized: data.username?.toLowerCase() || '',
        firstNameNormalized: data.firstName?.toLowerCase() || '',
        lastNameNormalized: data.lastName?.toLowerCase() || '',
        phoneNumberHash: data.phoneNumber
          ? this.hashPhoneNumber(data.phoneNumber)
          : '',
      });
      await this.userSearchIndexRepository.save(newSearchIndex);

      this.logger.debug(`Search index created for user ${userId}`);
    }
  }

  /**
   * Rebuild search indexes for all users
   */
  async rebuildSearchIndexes(): Promise<void> {
    try {
      this.logger.log('Starting search index rebuild...');

      // Rebuild flow: clear existing indexes then re-index all users
      await this.searchIndexService.clearAllIndexes();

      // Fetch all users (including inactive?) - reindexing typically covers active users
      const allUsers = await this.userRepository.findAllUsers();
      if (allUsers.length > 0) {
        // Use batch operation from SearchIndexService for efficiency
        await this.searchIndexService.batchIndexUsers(allUsers);
      }

      this.logger.log(
        'Search index rebuilt using SearchIndexService batch utilities',
      );
    } catch (error) {
      this.logger.error('Failed to rebuild search indexes:', error);
      throw error;
    }
  }
}
