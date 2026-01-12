import { Injectable, Logger } from '@nestjs/common';
import { ILike } from 'typeorm';
import { SearchIndexService } from '../cache';
import { UserRepository } from '../common/repositories';
import { User } from '../entities';

@Injectable()
export class UserSearchRepository {
    private readonly logger = new Logger(UserSearchRepository.name);

    constructor(
        private userRepository: UserRepository,
        private searchIndexService: SearchIndexService,
    ) { }

    /**
     * Find user by username with cache fallback strategy
     * 
     * Strategy:
     * 1. Try Redis cache first
     * 2. Fallback to database if not in cache
     * 3. Update cache if found in database
     */
    async findByUsername(username: string, includeInactive: boolean = false): Promise<User | null> {
        // Try cache first
        const cachedUserId = await this.searchIndexService.searchByUsername(username);

        if (cachedUserId) {
            const userFromCache = await this.findCachedUser(cachedUserId, includeInactive);
            if (userFromCache) {
                return userFromCache;
            }
        }

        // Fallback to database
        const user = await this.userRepository.findByUsernameInsensitive(
            username,
            includeInactive,
            ['privacySettings'],
        );

        // Update cache if found
        if (user) {
            await this.updateCache(user);
        }

        return user;
    }

    /**
     * Find user by phone number with cache fallback strategy
     * 
     * Strategy:
     * 1. Try Redis cache first
     * 2. Fallback to database if not in cache
     * 3. Update cache if found in database
     */
    async findByPhoneNumber(phoneNumber: string, includeInactive: boolean = false): Promise<User | null> {
        // Try cache first
        const cachedUserId = await this.searchIndexService.searchByPhoneNumber(phoneNumber);

        if (cachedUserId) {
            const userFromCache = await this.findCachedUser(cachedUserId, includeInactive);
            if (userFromCache) {
                return userFromCache;
            }
        }

        // Fallback to database
        const user = await this.userRepository.findByPhoneNumberWithFilter(
            phoneNumber,
            includeInactive,
            ['privacySettings'],
        );

        // Update cache if found
        if (user) {
            await this.updateCache(user);
        }

        return user;
    }

    /**
     * Find user from cache by userId
     * Returns user if found and matches activity criteria
     */
    private async findCachedUser(userId: string, includeInactive: boolean): Promise<User | null> {
        const cachedUser = await this.searchIndexService.getCachedUser(userId);

        if (!cachedUser) {
            return null;
        }

        if (!includeInactive && !cachedUser.isActive) {
            return null;
        }

        // Fetch full user with relations from database
        return await this.userRepository.findById(userId, ['privacySettings']);
    }

    /**
     * Update user in cache
     */
    private async updateCache(user: User): Promise<void> {
        try {
            await this.searchIndexService.indexUser(user);
        } catch (error) {
            this.logger.warn(`Failed to update cache for user ${user.id}:`, error);
            // Non-blocking: cache update failure shouldn't fail the search
        }
    }
}
