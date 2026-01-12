import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redisClient: any;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // Access the underlying Redis client from the Keyv store
    const stores = (this.cacheManager as any).store?.stores || [];
    const keyvStore = stores[0];
    this.redisClient = keyvStore?.client;
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await Promise.all(keys.map(key => this.cacheManager.del(key)));
    } catch (error) {
      this.logger.error(`Failed to delete cache keys:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(
        `Failed to check existence of cache key ${key}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Set TTL for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      // Get the current value and reset it with new TTL
      const value = await this.cacheManager.get(key);
      if (value !== undefined && value !== null) {
        await this.cacheManager.set(key, value, ttl * 1000);
      }
    } catch (error) {
      this.logger.error(`Failed to set TTL for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redisClient.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Add to a Redis set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redisClient.sAdd(key, members);
    } catch (error) {
      this.logger.error(`Failed to add to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove from a Redis set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redisClient.sRem(key, members);
    } catch (error) {
      this.logger.error(`Failed to remove from set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a Redis set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redisClient.sMembers(key);
    } catch (error) {
      this.logger.error(`Failed to get members of set ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if a member exists in a Redis set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      return await this.redisClient.sIsMember(key, member);
    } catch (error) {
      this.logger.error(`Failed to check membership in set ${key}:`, error);
      return false;
    }
  }

  /**
   * Add to a sorted set with score
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redisClient.zAdd(key, { score, value: member });
    } catch (error) {
      this.logger.error(`Failed to add to sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get range from sorted set
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redisClient.zRange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to get range from sorted set ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove from sorted set
   */
  async zrem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redisClient.zRem(key, members);
    } catch (error) {
      this.logger.error(`Failed to remove from sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment counter ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.redisClient.decr(key);
    } catch (error) {
      this.logger.error(`Failed to decrement counter ${key}:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple commands in a pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    try {
      const multi = this.redisClient.multi();
      commands.forEach(([command, ...args]) => {
        multi[command](...args);
      });
      return await multi.exec();
    } catch (error) {
      this.logger.error('Failed to execute pipeline:', error);
      throw error;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushall(): Promise<void> {
    try {
      await this.redisClient.flushAll();
    } catch (error) {
      this.logger.error('Failed to flush all cache:', error);
      throw error;
    }
  }
}
