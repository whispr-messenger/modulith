import { JobExecution } from './job-execution.entity';
import { ExecutionStatus } from '../enums';

describe('JobExecution Entity', () => {
    const createExecution = (overrides: Partial<JobExecution> = {}): JobExecution => {
        const execution = new JobExecution();
        execution.id = 'exec-id';
        execution.jobId = 'job-id';
        execution.status = ExecutionStatus.RUNNING;
        execution.startedAt = new Date();
        execution.retryAttempt = 0;
        execution.metadata = {};
        execution.priority = 1;
        Object.assign(execution, overrides);
        return execution;
    };

    describe('markAsCompleted', () => {
        it('should set status to COMPLETED and calculate duration', () => {
            const execution = createExecution({
                startedAt: new Date(Date.now() - 1000),
            });
            execution.markAsCompleted();

            expect(execution.status).toBe(ExecutionStatus.COMPLETED);
            expect(execution.completedAt).toBeInstanceOf(Date);
            expect(execution.durationMs).toBeGreaterThanOrEqual(1000);
        });

        it('should set output if provided', () => {
            const execution = createExecution();
            execution.markAsCompleted('result');

            expect(execution.output).toBe('result');
        });

        it('should not set output if not provided', () => {
            const execution = createExecution();
            execution.markAsCompleted();

            expect(execution.output).toBeUndefined();
        });
    });

    describe('markAsFailed', () => {
        it('should set status, error, and calculate duration', () => {
            const execution = createExecution({
                startedAt: new Date(Date.now() - 500),
            });
            execution.markAsFailed('Error message', { code: 404 });

            expect(execution.status).toBe(ExecutionStatus.FAILED);
            expect(execution.errorMessage).toBe('Error message');
            expect(execution.errorDetails).toEqual({ code: 404 });
            expect(execution.durationMs).toBeGreaterThanOrEqual(500);
        });

        it('should set errorDetails to null if not provided', () => {
            const execution = createExecution();
            execution.markAsFailed('Error');

            expect(execution.errorDetails).toBeNull();
        });
    });

    describe('markAsTimeout', () => {
        it('should set status to TIMEOUT with message', () => {
            const execution = createExecution();
            execution.markAsTimeout();

            expect(execution.status).toBe(ExecutionStatus.TIMEOUT);
            expect(execution.errorMessage).toBe('Execution timed out');
        });
    });

    describe('markAsCancelled', () => {
        it('should set status to CANCELLED', () => {
            const execution = createExecution();
            execution.markAsCancelled();

            expect(execution.status).toBe(ExecutionStatus.CANCELLED);
            expect(execution.completedAt).toBeInstanceOf(Date);
        });
    });

    describe('isRunning', () => {
        it('should return true when RUNNING', () => {
            const execution = createExecution({ status: ExecutionStatus.RUNNING });
            expect(execution.isRunning()).toBe(true);
        });

        it('should return false when not RUNNING', () => {
            const execution = createExecution({ status: ExecutionStatus.COMPLETED });
            expect(execution.isRunning()).toBe(false);
        });
    });

    describe('isCompleted', () => {
        it('should return true when COMPLETED', () => {
            const execution = createExecution({ status: ExecutionStatus.COMPLETED });
            expect(execution.isCompleted()).toBe(true);
        });

        it('should return false when not COMPLETED', () => {
            const execution = createExecution({ status: ExecutionStatus.RUNNING });
            expect(execution.isCompleted()).toBe(false);
        });
    });

    describe('isFailed', () => {
        it('should return true for FAILED', () => {
            const execution = createExecution({ status: ExecutionStatus.FAILED });
            expect(execution.isFailed()).toBe(true);
        });

        it('should return true for TIMEOUT', () => {
            const execution = createExecution({ status: ExecutionStatus.TIMEOUT });
            expect(execution.isFailed()).toBe(true);
        });

        it('should return false for COMPLETED', () => {
            const execution = createExecution({ status: ExecutionStatus.COMPLETED });
            expect(execution.isFailed()).toBe(false);
        });
    });

    describe('isCancelled', () => {
        it('should return true when CANCELLED', () => {
            const execution = createExecution({ status: ExecutionStatus.CANCELLED });
            expect(execution.isCancelled()).toBe(true);
        });
    });

    describe('isFinished', () => {
        it('should return true for terminal statuses', () => {
            [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.TIMEOUT, ExecutionStatus.CANCELLED].forEach((status) => {
                const execution = createExecution({ status });
                expect(execution.isFinished()).toBe(true);
            });
        });

        it('should return false for RUNNING', () => {
            const execution = createExecution({ status: ExecutionStatus.RUNNING });
            expect(execution.isFinished()).toBe(false);
        });
    });

    describe('getDurationInSeconds', () => {
        it('should return duration in seconds', () => {
            const execution = createExecution();
            execution.durationMs = 5500;
            expect(execution.getDurationInSeconds()).toBe(6);
        });

        it('should return 0 if no duration', () => {
            const execution = createExecution();
            execution.durationMs = null;
            expect(execution.getDurationInSeconds()).toBe(0);
        });
    });

    describe('getDurationFormatted', () => {
        it('should return "0s" when no duration', () => {
            const execution = createExecution();
            execution.durationMs = null;
            expect(execution.getDurationFormatted()).toBe('0s');
        });

        it('should format seconds only', () => {
            const execution = createExecution();
            execution.durationMs = 45000;
            expect(execution.getDurationFormatted()).toBe('45s');
        });

        it('should format minutes and seconds', () => {
            const execution = createExecution();
            execution.durationMs = 125000;
            expect(execution.getDurationFormatted()).toBe('2m 5s');
        });

        it('should format hours, minutes, and seconds', () => {
            const execution = createExecution();
            execution.durationMs = 3725000;
            expect(execution.getDurationFormatted()).toBe('1h 2m 5s');
        });
    });

    describe('getElapsedTime', () => {
        it('should return 0 if no startedAt', () => {
            const execution = createExecution();
            execution.startedAt = null;
            expect(execution.getElapsedTime()).toBe(0);
        });

        it('should calculate elapsed time', () => {
            const execution = createExecution({
                startedAt: new Date(Date.now() - 2000),
            });
            expect(execution.getElapsedTime()).toBeGreaterThanOrEqual(2000);
        });
    });

    describe('setExecutionContext', () => {
        it('should merge context', () => {
            const execution = createExecution();
            execution.executionContext = { a: 1 };
            execution.setExecutionContext({ b: 2 });

            expect(execution.executionContext).toEqual({ a: 1, b: 2 });
        });
    });

    describe('addMetadata', () => {
        it('should add key-value pair', () => {
            const execution = createExecution();
            execution.addMetadata('key', 'value');

            expect(execution.metadata.key).toBe('value');
        });
    });

    describe('setWorkerInfo', () => {
        it('should set worker info', () => {
            const execution = createExecution();
            execution.setWorkerInfo('worker-1', 'queue-1');

            expect(execution.workerId).toBe('worker-1');
            expect(execution.queueName).toBe('queue-1');
        });
    });

    describe('incrementRetryAttempt', () => {
        it('should increment retry attempt', () => {
            const execution = createExecution({ retryAttempt: 2 });
            execution.incrementRetryAttempt();
            expect(execution.retryAttempt).toBe(3);
        });
    });

    describe('getSuccessRate', () => {
        it('should return 100 for completed', () => {
            const execution = createExecution({ status: ExecutionStatus.COMPLETED });
            expect(execution.getSuccessRate()).toBe(100);
        });

        it('should return 0 for non-completed', () => {
            const execution = createExecution({ status: ExecutionStatus.RUNNING });
            expect(execution.getSuccessRate()).toBe(0);
        });
    });

    describe('getPerformanceMetrics', () => {
        it('should return metrics object', () => {
            const execution = createExecution();
            execution.durationMs = 1000;
            execution.workerId = 'w1';
            execution.queueName = 'q1';

            const metrics = execution.getPerformanceMetrics();

            expect(metrics).toEqual({
                duration: 1000,
                status: ExecutionStatus.RUNNING,
                retryAttempt: 0,
                workerId: 'w1',
                queueName: 'q1',
            });
        });
    });
});
