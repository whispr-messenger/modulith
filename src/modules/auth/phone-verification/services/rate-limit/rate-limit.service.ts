import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Service responsible for rate limiting operations.
 * Provides generic rate limiting functionality that can be reused across the application.
 */
@Injectable()
export class RateLimitService {
	constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

	/**
	 * Checks if a key has exceeded its rate limit.
	 * @param key - The unique key to check (e.g., "rate_limit:+33612345678")
	 * @param maxRequests - Maximum number of requests allowed
	 * @param ttl - Time window in seconds
	 * @param errorMessage - Custom error message (optional)
	 * @throws HttpException with TOO_MANY_REQUESTS status if limit is exceeded
	 */
	public async checkLimit(
		key: string,
		maxRequests: number,
		ttl: number,
		errorMessage: string = 'Too many requests'
	): Promise<void> {
		const count = await this.cacheManager.get<string>(key);

		if (count && parseInt(count) >= maxRequests) {
			throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
		}
	}

	/**
	 * Increments the request counter for a given key.
	 * @param key - The unique key to increment
	 * @param ttl - Time to live in seconds
	 */
	public async increment(key: string, ttl: number): Promise<void> {
		let current = (await this.cacheManager.get<number>(key)) || 0;
		current++;
		await this.cacheManager.set(key, current, ttl * 1000);
	}

	/**
	 * Gets the number of remaining attempts for a given key.
	 * @param key - The unique key to check
	 * @param maxRequests - Maximum number of requests allowed
	 * @returns Number of remaining attempts
	 */
	public async getRemainingAttempts(key: string, maxRequests: number): Promise<number> {
		const count = await this.cacheManager.get<number>(key);
		const current = count || 0;
		return Math.max(0, maxRequests - current);
	}

	/**
	 * Resets the rate limit counter for a given key.
	 * @param key - The unique key to reset
	 */
	public async reset(key: string): Promise<void> {
		await this.cacheManager.del(key);
	}
}
