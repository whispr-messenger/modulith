/**
 * Swagger schemas for Signal Protocol Health & Monitoring endpoints
 */

export const SIGNAL_HEALTH_STATUS_SCHEMA = {
    type: 'object',
    properties: {
        status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            example: 'healthy',
            description: 'Overall health status of the Signal key management system',
        },
        timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-08T14:30:00Z',
            description: 'Timestamp of the health check',
        },
        scheduler: {
            type: 'object',
            description: 'Scheduler job execution status',
            properties: {
                isHealthy: {
                    type: 'boolean',
                    example: true,
                    description: 'Whether all scheduled jobs are running as expected',
                },
                lastCleanupTime: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-01-08T14:00:00Z',
                    description: 'Last time the cleanup job ran',
                },
                lastPreKeyCheckTime: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-01-08T14:15:00Z',
                    description: 'Last time the prekey check job ran',
                },
                lastOldPreKeyCleanupTime: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-01-08T14:20:00Z',
                    description: 'Last time the old prekey cleanup job ran',
                },
            },
        },
        prekeys: {
            type: 'object',
            description: 'System-wide prekey statistics',
            properties: {
                totalUnused: {
                    type: 'number',
                    example: 5420,
                    description: 'Total number of unused prekeys across all devices',
                },
                devicesWithLowPrekeys: {
                    type: 'number',
                    example: 2,
                    description: 'Number of devices with less than 20 available prekeys',
                },
                devicesWithNoPrekeys: {
                    type: 'number',
                    example: 0,
                    description: 'Number of devices with zero available prekeys (critical)',
                },
            },
        },
        issues: {
            type: 'array',
            items: { type: 'string' },
            example: [],
            description: 'List of detected issues with the system',
        },
    },
};

export const CLEANUP_RESULT_SCHEMA = {
    type: 'object',
    properties: {
        message: {
            type: 'string',
            example: 'Cleanup completed successfully',
            description: 'Confirmation message',
        },
        expiredKeysDeleted: {
            type: 'number',
            example: 5,
            description: 'Number of expired keys that were deleted',
        },
        oldPreKeysDeleted: {
            type: 'number',
            example: 23,
            description: 'Number of old prekeys that were deleted',
        },
    },
};

export const SIGNAL_HEALTH_STATUS_EXAMPLES = {
    healthy: {
        summary: 'System is healthy',
        value: {
            status: 'healthy',
            timestamp: '2026-01-08T14:30:00Z',
            scheduler: {
                isHealthy: true,
                lastCleanupTime: '2026-01-08T14:00:00Z',
                lastPreKeyCheckTime: '2026-01-08T14:15:00Z',
                lastOldPreKeyCleanupTime: '2026-01-08T14:20:00Z',
            },
            prekeys: {
                totalUnused: 5420,
                devicesWithLowPrekeys: 2,
                devicesWithNoPrekeys: 0,
            },
            issues: [],
        },
    },
    degraded: {
        summary: 'System is degraded',
        value: {
            status: 'degraded',
            timestamp: '2026-01-08T14:30:00Z',
            scheduler: {
                isHealthy: true,
                lastCleanupTime: '2026-01-08T14:00:00Z',
                lastPreKeyCheckTime: '2026-01-08T14:15:00Z',
                lastOldPreKeyCleanupTime: '2026-01-08T14:20:00Z',
            },
            prekeys: {
                totalUnused: 950,
                devicesWithLowPrekeys: 15,
                devicesWithNoPrekeys: 0,
            },
            issues: [
                '15 devices have low prekey counts (< 20)',
                'System-wide prekey count is low (950 total unused)',
            ],
        },
    },
    unhealthy: {
        summary: 'System is unhealthy',
        value: {
            status: 'unhealthy',
            timestamp: '2026-01-08T14:30:00Z',
            scheduler: {
                isHealthy: false,
                lastCleanupTime: '2026-01-07T10:00:00Z',
                lastPreKeyCheckTime: null,
                lastOldPreKeyCleanupTime: '2026-01-07T11:30:00Z',
            },
            prekeys: {
                totalUnused: 350,
                devicesWithLowPrekeys: 45,
                devicesWithNoPrekeys: 3,
            },
            issues: [
                'Scheduler jobs not running as expected',
                '3 devices have no available prekeys (cannot initiate conversations)',
                '45 devices have low prekey counts (< 20)',
                'System-wide prekey count is low (350 total unused)',
            ],
        },
    },
};

export const CLEANUP_RESULT_EXAMPLES = {
    success: {
        summary: 'Successful cleanup',
        value: {
            message: 'Cleanup completed successfully',
            expiredKeysDeleted: 5,
            oldPreKeysDeleted: 23,
        },
    },
    noCleanupNeeded: {
        summary: 'No cleanup needed',
        value: {
            message: 'Cleanup completed successfully',
            expiredKeysDeleted: 0,
            oldPreKeysDeleted: 0,
        },
    },
};
