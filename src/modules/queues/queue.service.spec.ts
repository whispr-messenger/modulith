import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueName, JobPriority } from './enums';
import { JobType } from '../scheduler/enums';

describe('QueueService', () => {
    let service: QueueService;
    let schedulerQueue: any;
    let priorityQueue: any;
    let delayedQueue: any;

    const createMockJob = (id: string, data: any, opts: any = {}) => ({
        id,
        data,
        opts,
        remove: jest.fn(),
        retry: jest.fn(),
        ...opts,
    });

    const createMockQueue = () => ({
        add: jest.fn().mockImplementation((name, data, opts) => Promise.resolve(createMockJob(data.id || 'job-id', data, opts))),
        getJob: jest.fn(),
        getJobs: jest.fn().mockResolvedValue([]),
        getJobCounts: jest.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
        }),
        pause: jest.fn(),
        resume: jest.fn(),
        clean: jest.fn(),
    });

    beforeEach(async () => {
        const mockSchedulerQueue = createMockQueue();
        const mockPriorityQueue = createMockQueue();
        const mockDelayedQueue = createMockQueue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QueueService,
                {
                    provide: getQueueToken('scheduler'),
                    useValue: mockSchedulerQueue,
                },
                {
                    provide: getQueueToken('priority'),
                    useValue: mockPriorityQueue,
                },
                {
                    provide: getQueueToken('delayed'),
                    useValue: mockDelayedQueue,
                },
            ],
        }).compile();

        service = module.get<QueueService>(QueueService);
        schedulerQueue = module.get(getQueueToken('scheduler'));
        priorityQueue = module.get(getQueueToken('priority'));
        delayedQueue = module.get(getQueueToken('delayed'));

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('addJob', () => {
        it('should add job to scheduler queue by default', async () => {
            const data = { id: '1', type: JobType.NOTIFICATION, payload: {} };
            await service.addJob(data);
            expect(schedulerQueue.add).toHaveBeenCalled();
            expect(priorityQueue.add).not.toHaveBeenCalled();
            expect(delayedQueue.add).not.toHaveBeenCalled();
        });

        it('should add job to priority queue if high priority', async () => {
            const data = { id: '1', type: JobType.NOTIFICATION, payload: {} };
            const options = { priority: JobPriority.HIGH };
            await service.addJob(data, options);
            expect(priorityQueue.add).toHaveBeenCalled();
            expect(schedulerQueue.add).not.toHaveBeenCalled();
        });

        it('should add job to delayed queue if delay present', async () => {
            const data = { id: '1', type: JobType.NOTIFICATION, payload: {} };
            const options = { delay: 1000 };
            await service.addJob(data, options);
            expect(delayedQueue.add).toHaveBeenCalled();
            expect(schedulerQueue.add).not.toHaveBeenCalled();
        });
    });

    describe('getJob', () => {
        it('should search all queues', async () => {
            schedulerQueue.getJob.mockResolvedValue(null);
            priorityQueue.getJob.mockResolvedValue(createMockJob('1', {}));
            delayedQueue.getJob.mockResolvedValue(null);

            const job = await service.getJob('1');
            expect(job).toBeDefined();
            expect(job.id).toBe('1');
            expect(schedulerQueue.getJob).toHaveBeenCalledWith('1');
            expect(priorityQueue.getJob).toHaveBeenCalledWith('1');
        });

        it('should return null if not found in any queue', async () => {
            schedulerQueue.getJob.mockResolvedValue(null);
            priorityQueue.getJob.mockResolvedValue(null);
            delayedQueue.getJob.mockResolvedValue(null);

            expect(await service.getJob('1')).toBeNull();
        });
    });

    describe('removeJob', () => {
        it('should try to remove from all queues', async () => {
            const mockJob = createMockJob('1', {});
            schedulerQueue.getJob.mockResolvedValue(mockJob);

            await service.removeJob('1');

            expect(mockJob.remove).toHaveBeenCalled();
            expect(schedulerQueue.getJob).toHaveBeenCalledWith('1');
            expect(priorityQueue.getJob).toHaveBeenCalledWith('1');
            expect(delayedQueue.getJob).toHaveBeenCalledWith('1');
        });
    });

    describe('getQueueStats', () => {
        it('should aggregate stats from all queues', async () => {
            const stats = { waiting: 1, active: 1, completed: 1, failed: 1, delayed: 1, paused: 1 };
            schedulerQueue.getJobCounts.mockResolvedValue(stats);
            priorityQueue.getJobCounts.mockResolvedValue(stats);
            delayedQueue.getJobCounts.mockResolvedValue(stats);

            const result = await service.getQueueStats();

            expect(result.total.waiting).toBe(3);
            expect(result.scheduler).toEqual(stats);
        });
    });

    describe('pause/resume Queue', () => {
        it('should pause specific queue', async () => {
            await service.pauseQueue(QueueName.SCHEDULER);
            expect(schedulerQueue.pause).toHaveBeenCalled();
            expect(priorityQueue.pause).not.toHaveBeenCalled();
        });

        it('should resume specific queue', async () => {
            await service.resumeQueue(QueueName.PRIORITY);
            expect(priorityQueue.resume).toHaveBeenCalled();
            expect(schedulerQueue.resume).not.toHaveBeenCalled();
        });

        it('should throw error for unknown queue', async () => {
            await expect(service.pauseQueue('unknown' as QueueName)).rejects.toThrow();
        });
    });

    describe('cleanQueue', () => {
        it('should clean all queues', async () => {
            await service.cleanQueue('completed', 1000);
            expect(schedulerQueue.clean).toHaveBeenCalledWith(1000, 100, 'completed');
            expect(priorityQueue.clean).toHaveBeenCalledWith(1000, 100, 'completed');
            expect(delayedQueue.clean).toHaveBeenCalledWith(1000, 100, 'completed');
        });
    });

    describe('getJobsByState', () => {
        it('should aggregate jobs from all queues', async () => {
            schedulerQueue.getJobs.mockResolvedValue([{ id: '1' }]);
            priorityQueue.getJobs.mockResolvedValue([{ id: '2' }]);

            const jobs = await service.getJobsByState('waiting');
            expect(jobs).toHaveLength(2);
            expect(schedulerQueue.getJobs).toHaveBeenCalled();
        });
    });

    describe('retryFailedJobs', () => {
        it('should retry failed jobs in all queues', async () => {
            const job1 = createMockJob('1', {});
            const job2 = createMockJob('2', {});

            schedulerQueue.getJobs.mockResolvedValue([job1]);
            priorityQueue.getJobs.mockResolvedValue([job2]);

            const count = await service.retryFailedJobs();

            expect(count).toBe(2);
            expect(job1.retry).toHaveBeenCalled();
            expect(job2.retry).toHaveBeenCalled();
        });
    });
});
