import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConfig {
    private client: Redis;

    constructor(private configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST', 'localhost'),
            port: this.configService.get<number>('REDIS_PORT', 6379),
            password: this.configService.get<string>('REDIS_PASSWORD'),
            db: this.configService.get<number>('REDIS_DB', 0),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        this.client.on('connect', () => {
            console.log('Redis Client Connected');
        });
    }

    getClient(): Redis {
        return this.client;
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
