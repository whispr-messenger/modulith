import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';

/**
 * Service pour gérer le cycle de vie de l'application
 * et assurer un arrêt propre des connexions
 */
@Injectable()
export class LifecycleService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LifecycleService.name);
    private isShuttingDown = false;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) { }

    onModuleInit() {
        this.logger.log('Application modules initialized');

        // Configurer les handlers pour un shutdown propre
        this.setupGracefulShutdown();
    }

    onModuleDestroy() {
        this.logger.log('Application is shutting down');
    }

    private setupGracefulShutdown() {
        // Gérer SIGTERM (Docker, Kubernetes)
        process.once('SIGTERM', () => {
            this.logger.warn('SIGTERM received, shutting down gracefully');
            this.gracefulShutdown();
        });

        // Gérer SIGINT (Ctrl+C)
        process.once('SIGINT', () => {
            this.logger.warn('SIGINT received, shutting down gracefully');
            this.gracefulShutdown();
        });
    }

    private async gracefulShutdown() {
        // Éviter les appels multiples
        if (this.isShuttingDown) {
            return;
        }
        this.isShuttingDown = true;

        try {
            // Fermer les connexions Redis proprement
            const store = (this.cacheManager as any).store;
            if (store?.client) {
                this.logger.log('Closing Redis connection...');
                await store.client.quit();
                this.logger.log('Redis connection closed');
            }
        } catch (error) {
            this.logger.error('Error during graceful shutdown:', error);
        }
    }
}
