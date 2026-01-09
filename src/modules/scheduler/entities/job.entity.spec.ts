import { Job } from './job.entity';
import { JobStatus, JobType } from '../enums';

describe('Job Entity', () => {
    const createJob = (overrides: Partial<Job> = {}): Job => {
        const job = new Job();
        job.id = 'test-id';
        job.name = 'Test Job';
        job.type = JobType.NOTIFICATION;
        job.status = JobStatus.PENDING;
        job.priority = 1;
        job.maxRetries = 3;
        job.retryCount = 0;
        job.payload = {};
        job.metadata = {};
        Object.assign(job, overrides);
        return job;
    };

    describe('canRetry', () => {
        it('should return true when status is FAILED and retries remain', () => {
            const job = createJob({ status: JobStatus.FAILED, retryCount: 1, maxRetries: 3 });
            expect(job.canRetry()).toBe(true);
        });

        it('should return false when retry count equals maxRetries', () => {
            const job = createJob({ status: JobStatus.FAILED, retryCount: 3, maxRetries: 3 });
            expect(job.canRetry()).toBe(false);
        });

        it('should return false when status is not FAILED', () => {
            const job = createJob({ status: JobStatus.PENDING, retryCount: 0 });
            expect(job.canRetry()).toBe(false);
        });
    });

    describe('isExecutable', () => {
        it('should return true for PENDING status', () => {
            const job = createJob({ status: JobStatus.PENDING });
            expect(job.isExecutable()).toBe(true);
        });

        it('should return true for RETRY status', () => {
            const job = createJob({ status: JobStatus.RETRY });
            expect(job.isExecutable()).toBe(true);
        });

        it('should return false for RUNNING status', () => {
            const job = createJob({ status: JobStatus.RUNNING });
            expect(job.isExecutable()).toBe(false);
        });
    });

    describe('isPaused', () => {
        it('should return true when status is PAUSED', () => {
            const job = createJob({ status: JobStatus.PAUSED });
            expect(job.isPaused()).toBe(true);
        });

        it('should return false when status is not PAUSED', () => {
            const job = createJob({ status: JobStatus.PENDING });
            expect(job.isPaused()).toBe(false);
        });
    });

    describe('isCompleted', () => {
        it('should return true for COMPLETED status', () => {
            const job = createJob({ status: JobStatus.COMPLETED });
            expect(job.isCompleted()).toBe(true);
        });

        it('should return true for CANCELLED status', () => {
            const job = createJob({ status: JobStatus.CANCELLED });
            expect(job.isCompleted()).toBe(true);
        });

        it('should return false for RUNNING status', () => {
            const job = createJob({ status: JobStatus.RUNNING });
            expect(job.isCompleted()).toBe(false);
        });
    });

    describe('isFailed', () => {
        it('should return true when status is FAILED', () => {
            const job = createJob({ status: JobStatus.FAILED });
            expect(job.isFailed()).toBe(true);
        });

        it('should return false when status is not FAILED', () => {
            const job = createJob({ status: JobStatus.COMPLETED });
            expect(job.isFailed()).toBe(false);
        });
    });

    describe('markAsRunning', () => {
        it('should set status to RUNNING and startedAt', () => {
            const job = createJob();
            job.markAsRunning();

            expect(job.status).toBe(JobStatus.RUNNING);
            expect(job.startedAt).toBeInstanceOf(Date);
        });
    });

    describe('markAsCompleted', () => {
        it('should set status to COMPLETED and completedAt', () => {
            const job = createJob();
            job.markAsCompleted();

            expect(job.status).toBe(JobStatus.COMPLETED);
            expect(job.completedAt).toBeInstanceOf(Date);
        });
    });

    describe('markAsFailed', () => {
        it('should set status to FAILED, increment retryCount, and set error details', () => {
            const job = createJob({ maxRetries: 0 });
            job.markAsFailed('Error message', { code: 500 });

            expect(job.status).toBe(JobStatus.FAILED);
            expect(job.retryCount).toBe(1);
            expect(job.errorMessage).toBe('Error message');
            expect(job.errorDetails).toEqual({ code: 500 });
        });

        it('should set status to RETRY if canRetry is true', () => {
            const job = createJob({ maxRetries: 3 });
            job.markAsFailed('Error');

            expect(job.status).toBe(JobStatus.RETRY);
            expect(job.nextRetryAt).toBeInstanceOf(Date);
        });

        it('should handle missing error details', () => {
            const job = createJob({ maxRetries: 0 });
            job.markAsFailed();

            expect(job.errorMessage).toBeNull();
            expect(job.errorDetails).toBeNull();
        });
    });

    describe('markAsPaused', () => {
        it('should set status to PAUSED', () => {
            const job = createJob();
            job.markAsPaused();
            expect(job.status).toBe(JobStatus.PAUSED);
        });
    });

    describe('markAsCancelled', () => {
        it('should set status to CANCELLED and completedAt', () => {
            const job = createJob();
            job.markAsCancelled();

            expect(job.status).toBe(JobStatus.CANCELLED);
            expect(job.completedAt).toBeInstanceOf(Date);
        });
    });

    describe('reset', () => {
        it('should reset all state to initial values', () => {
            const job = createJob({
                status: JobStatus.FAILED,
                retryCount: 2,
                startedAt: new Date(),
                completedAt: new Date(),
                failedAt: new Date(),
                errorMessage: 'Error',
                errorDetails: { x: 1 },
                nextRetryAt: new Date(),
            });

            job.reset();

            expect(job.status).toBe(JobStatus.PENDING);
            expect(job.retryCount).toBe(0);
            expect(job.startedAt).toBeNull();
            expect(job.completedAt).toBeNull();
            expect(job.failedAt).toBeNull();
            expect(job.errorMessage).toBeNull();
            expect(job.errorDetails).toBeNull();
            expect(job.nextRetryAt).toBeNull();
        });
    });

    describe('getDuration', () => {
        it('should return null if startedAt is not set', () => {
            const job = createJob();
            expect(job.getDuration()).toBeNull();
        });

        it('should return duration from startedAt to completedAt', () => {
            const job = createJob();
            job.startedAt = new Date('2024-01-01T10:00:00Z');
            job.completedAt = new Date('2024-01-01T10:00:05Z');

            expect(job.getDuration()).toBe(5000);
        });

        it('should use failedAt if completedAt is not set', () => {
            const job = createJob();
            job.startedAt = new Date('2024-01-01T10:00:00Z');
            job.failedAt = new Date('2024-01-01T10:00:03Z');

            expect(job.getDuration()).toBe(3000);
        });

        it('should calculate from startedAt to now if no end time', () => {
            const job = createJob();
            job.startedAt = new Date(Date.now() - 1000);
            const duration = job.getDuration();
            expect(duration).toBeGreaterThanOrEqual(1000);
            expect(duration).toBeLessThan(2000);
        });
    });

    describe('getProgress', () => {
        it('should return 100 for COMPLETED', () => {
            const job = createJob({ status: JobStatus.COMPLETED });
            expect(job.getProgress()).toBe(100);
        });

        it('should return 0 for FAILED', () => {
            const job = createJob({ status: JobStatus.FAILED });
            expect(job.getProgress()).toBe(0);
        });

        it('should return 0 for CANCELLED', () => {
            const job = createJob({ status: JobStatus.CANCELLED });
            expect(job.getProgress()).toBe(0);
        });

        it('should return 50 for RUNNING', () => {
            const job = createJob({ status: JobStatus.RUNNING });
            expect(job.getProgress()).toBe(50);
        });

        it('should return 0 for PENDING', () => {
            const job = createJob({ status: JobStatus.PENDING });
            expect(job.getProgress()).toBe(0);
        });
    });
});
