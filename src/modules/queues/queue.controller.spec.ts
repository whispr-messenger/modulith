import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueName } from './enums';
import { QueueJobData, QueueOptions } from './queue.service';

describe('QueueController', () => {
    let controller: QueueController;
    let service: QueueService;

    const mockQueueService = {
        getQueueStats: jest.fn(),
        getQueueHealth: jest.fn(),
        getFailedJobs: jest.fn(),
        getJobsByState: jest.fn(),
        addJob: jest.fn(),
        removeJob: jest.fn(),
        pauseQueue: jest.fn(),
        resumeQueue: jest.fn(),
        cleanQueue: jest.fn(),
        retryFailedJobs: jest.fn(),
        getJob: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [QueueController],
            providers: [
                {
                    provide: QueueService,
                    useValue: mockQueueService,
                },
            ],
        }).compile();

        controller = module.get<QueueController>(QueueController);
        service = module.get<QueueService>(QueueService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getQueueStats', () => {
        it('should return stats', async () => {
            const stats = { total: 10 };
            mockQueueService.getQueueStats.mockResolvedValue(stats);
            expect(await controller.getQueueStats()).toBe(stats);
        });
    });

    describe('getQueueHealth', () => {
        it('should return health', async () => {
            const health = { healthy: true };
            mockQueueService.getQueueHealth.mockResolvedValue(health);
            expect(await controller.getQueueHealth()).toBe(health);
        });
    });

    describe('getFailedJobs', () => {
        it('should return failed jobs', async () => {
            const jobs = [{ id: '1' }];
            mockQueueService.getFailedJobs.mockResolvedValue(jobs);
            expect(await controller.getFailedJobs(20)).toBe(jobs);
            expect(service.getFailedJobs).toHaveBeenCalledWith(20);
        });
    });

    describe('getJobsByState', () => {
        it('should return jobs by state', async () => {
            const jobs = [{ id: '1' }];
            mockQueueService.getJobsByState.mockResolvedValue(jobs);
            expect(await controller.getJobsByState('waiting', 20, 0)).toBe(jobs);
            expect(service.getJobsByState).toHaveBeenCalledWith('waiting', 20, 0);
        });
    });

    describe('addJob', () => {
        it('should add a job', async () => {
            const data: QueueJobData = { id: '1', type: 'test', payload: {} };
            const options: QueueOptions = { priority: 1 };
            const result = { id: '1' };
            mockQueueService.addJob.mockResolvedValue(result);

            expect(await controller.addJob({ data, options })).toBe(result);
            expect(service.addJob).toHaveBeenCalledWith(data, options);
        });
    });

    describe('removeJob', () => {
        it('should remove a job', async () => {
            mockQueueService.removeJob.mockResolvedValue(undefined);
            expect(await controller.removeJob('1')).toEqual({ message: 'Job removed from all queues' });
            expect(service.removeJob).toHaveBeenCalledWith('1');
        });
    });

    describe('pauseQueue', () => {
        it('should pause queue', async () => {
            mockQueueService.pauseQueue.mockResolvedValue(undefined);
            expect(await controller.pauseQueue(QueueName.SCHEDULER)).toEqual({ message: `Queue ${QueueName.SCHEDULER} paused` });
            expect(service.pauseQueue).toHaveBeenCalledWith(QueueName.SCHEDULER);
        });
    });

    describe('resumeQueue', () => {
        it('should resume queue', async () => {
            mockQueueService.resumeQueue.mockResolvedValue(undefined);
            expect(await controller.resumeQueue(QueueName.SCHEDULER)).toEqual({ message: `Queue ${QueueName.SCHEDULER} resumed` });
            expect(service.resumeQueue).toHaveBeenCalledWith(QueueName.SCHEDULER);
        });
    });

    describe('cleanQueues', () => {
        it('should clean queues', async () => {
            mockQueueService.cleanQueue.mockResolvedValue(undefined);
            const body = { status: 'completed' as const, olderThan: 1000 };
            expect(await controller.cleanQueues(body)).toEqual({ message: 'Cleaned completed jobs older than 1000ms' });
            expect(service.cleanQueue).toHaveBeenCalledWith('completed', 1000);
        });
    });

    describe('retryFailedJobs', () => {
        it('should retry failed jobs', async () => {
            mockQueueService.retryFailedJobs.mockResolvedValue(5);
            expect(await controller.retryFailedJobs(10)).toEqual({ message: 'Retried 5 failed jobs' });
            expect(service.retryFailedJobs).toHaveBeenCalledWith(10);
        });
    });

    describe('getJob', () => {
        it('should return job details', async () => {
            const job = {
                id: '1',
                name: 'job',
                data: {},
                opts: {},
                progress: 0,
                processedOn: 1,
                finishedOn: 2,
                failedReason: null,
                attemptsMade: 0
            };
            mockQueueService.getJob.mockResolvedValue(job);
            expect(await controller.getJob('1')).toEqual({
                id: '1',
                name: 'job',
                data: {},
                opts: {},
                progress: 0,
                processedOn: 1,
                finishedOn: 2,
                failedReason: null,
                attemptsMade: 0
            });
        });

        it('should return error if job not found', async () => {
            mockQueueService.getJob.mockResolvedValue(null);
            expect(await controller.getJob('1')).toEqual({ error: 'Job not found' });
        });
    });
});
