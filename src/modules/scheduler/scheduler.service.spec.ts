import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { Job } from './entities/job.entity';
import { Schedule } from './entities/schedule.entity';
import { JobExecution } from './entities/job-execution.entity';
import { JobStatus, JobType, ExecutionStatus } from './enums';

describe('SchedulerService', () => {
    let service: SchedulerService;
    let jobRepository: any;
    let scheduleRepository: any;
    let executionRepository: any;
    let schedulerQueue: any;

    const createMockJob = (data: Partial<Job> = {}) => ({
        id: 'job-id',
        name: 'Test Job',
        type: JobType.NOTIFICATION,
        status: JobStatus.PENDING,
        priority: 1,
        maxRetries: 3,
        retryCount: 0,
        metadata: {},
        canRetry: jest.fn().mockReturnValue(true),
        isExecutable: jest.fn().mockReturnValue(true),
        markAsRunning: jest.fn(),
        markAsPaused: jest.fn(),
        markAsCancelled: jest.fn(),
        markAsCompleted: jest.fn(),
        markAsFailed: jest.fn(),
        ...data,
    } as unknown as Job);

    const createMockExecution = (data: Partial<JobExecution> = {}) => ({
        id: 'execution-id',
        jobId: 'job-id',
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
        markAsCompleted: jest.fn(),
        markAsFailed: jest.fn(),
        markAsTimeout: jest.fn(),
        markAsCancelled: jest.fn(),
        job: createMockJob(),
        ...data,
    } as unknown as JobExecution);

    const mockJobRepository = {
        create: jest.fn().mockImplementation((dto) => createMockJob(dto)),
        save: jest.fn().mockImplementation((job) => Promise.resolve(job)),
        findOne: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        })),
    };

    const mockScheduleRepository = {
        create: jest.fn().mockImplementation((dto) => ({ id: 'schedule-id', ...dto })),
        save: jest.fn().mockImplementation((schedule) => Promise.resolve(schedule)),
    };

    const mockExecutionRepository = {
        create: jest.fn().mockImplementation((dto) => createMockExecution(dto)),
        save: jest.fn().mockImplementation((execution) => Promise.resolve(execution)),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockQueue = {
        add: jest.fn(),
        getJob: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                {
                    provide: getRepositoryToken(Job),
                    useValue: mockJobRepository,
                },
                {
                    provide: getRepositoryToken(Schedule),
                    useValue: mockScheduleRepository,
                },
                {
                    provide: getRepositoryToken(JobExecution),
                    useValue: mockExecutionRepository,
                },
                {
                    provide: getQueueToken('scheduler'),
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        jobRepository = module.get(getRepositoryToken(Job));
        scheduleRepository = module.get(getRepositoryToken(Schedule));
        executionRepository = module.get(getRepositoryToken(JobExecution));
        schedulerQueue = module.get(getQueueToken('scheduler'));

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createJob', () => {
        it('should create and save a job', async () => {
            const dto = { name: 'Test Job', type: JobType.NOTIFICATION, payload: {} };
            const result = await service.createJob(dto);

            expect(result.name).toBe(dto.name);
            expect(jobRepository.create).toHaveBeenCalledWith(expect.objectContaining(dto));
            expect(jobRepository.save).toHaveBeenCalled();
        });
    });

    describe('findJobById', () => {
        it('should return a job if found', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);

            const result = await service.findJobById('job-id');
            expect(result).toBe(job);
        });

        it('should return null if not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            expect(await service.findJobById('job-id')).toBeNull();
        });
    });

    describe('deleteJob', () => {
        it('should delete job and remove from queue', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);
            const bullJob = { remove: jest.fn() };
            mockQueue.getJob.mockResolvedValue(bullJob);

            await service.deleteJob('job-id');

            expect(mockQueue.getJob).toHaveBeenCalledWith('job-id');
            expect(bullJob.remove).toHaveBeenCalled();
            expect(jobRepository.delete).toHaveBeenCalledWith('job-id');
        });

        it('should delete job even if queue removal fails', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);
            mockQueue.getJob.mockRejectedValue(new Error('Queue error'));

            await service.deleteJob('job-id');

            expect(jobRepository.delete).toHaveBeenCalledWith('job-id');
        });

        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.deleteJob('job-id')).rejects.toThrow('Job not found');
        });
    });

    describe('scheduleJob', () => {
        it('should schedule a job', async () => {
            const job = createMockJob({ id: 'job-id', type: JobType.NOTIFICATION });
            mockJobRepository.findOne.mockResolvedValue(job);
            const dto = { cronExpression: '* * * * *', isActive: true };

            await service.scheduleJob('job-id', dto);

            expect(scheduleRepository.create).toHaveBeenCalled();
            expect(scheduleRepository.save).toHaveBeenCalled();
            expect(mockQueue.add).toHaveBeenCalledWith(
                job.type,
                expect.objectContaining({ jobId: 'job-id' }),
                expect.objectContaining({ repeat: { pattern: dto.cronExpression } })
            );
        });

        it('should throw BadRequestException for invalid cron', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);
            const dto = { cronExpression: 'invalid', isActive: true };

            await expect(service.scheduleJob('job-id', dto)).rejects.toThrow('Invalid cron expression');
        });
    });

    describe('executeJob', () => {
        it('should execute job successfully', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);

            const result = await service.executeJob('job-id');

            expect(job.markAsRunning).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalledWith(job);
            expect(executionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                jobId: 'job-id',
                status: ExecutionStatus.RUNNING,
            }));
            expect(executionRepository.save).toHaveBeenCalled();
            expect(mockQueue.add).toHaveBeenCalled();
        });

        it('should throw BadRequestException if job is not executable', async () => {
            const job = createMockJob();
            job.isExecutable = jest.fn().mockReturnValue(false);
            mockJobRepository.findOne.mockResolvedValue(job);

            await expect(service.executeJob('job-id')).rejects.toThrow('Job is not in an executable state');
        });
    });

    describe('getJobStatistics', () => {
        it('should return statistics', async () => {
            const stats = [{ status: JobStatus.PENDING, count: '5' }];
            mockJobRepository.createQueryBuilder.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(stats),
            });

            const result = await service.getJobStatistics();
            expect(result[JobStatus.PENDING]).toBe(5);
        });
    });

    describe('lifecycle methods', () => {
        it('should pause job', async () => {
            const job = createMockJob({ status: JobStatus.PENDING });
            mockJobRepository.findOne.mockResolvedValue(job);

            await service.pauseJob('job-id');

            expect(job.markAsPaused).toHaveBeenCalled();
            expect(mockQueue.pause).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should resume job', async () => {
            const job = createMockJob({ status: JobStatus.PAUSED });
            mockJobRepository.findOne.mockResolvedValue(job);

            await service.resumeJob('job-id');

            expect(job.status).toBe(JobStatus.PENDING);
            expect(mockQueue.resume).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should cancel job', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);

            await service.cancelJob('job-id');

            expect(job.markAsCancelled).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should retry job', async () => {
            const job = createMockJob();
            job.canRetry = jest.fn().mockReturnValue(true);
            mockJobRepository.findOne.mockResolvedValue(job);

            await service.retryJob('job-id');

            expect(job.status).toBe(JobStatus.PENDING);
            expect(mockQueue.add).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should not retry if cannot retry', async () => {
            const job = createMockJob();
            job.canRetry = jest.fn().mockReturnValue(false);
            mockJobRepository.findOne.mockResolvedValue(job);

            await expect(service.retryJob('job-id')).rejects.toThrow('Job cannot be retried');
        });
    });

    describe('execution completion', () => {
        it('should complete execution and job', async () => {
            const execution = createMockExecution();
            mockExecutionRepository.findOne.mockResolvedValue(execution);

            await service.completeJobExecution('exec-id', 'output');

            expect(execution.markAsCompleted).toHaveBeenCalledWith('output');
            expect(execution.job.markAsCompleted).toHaveBeenCalled();
            expect(executionRepository.save).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should fail execution and job', async () => {
            const execution = createMockExecution();
            mockExecutionRepository.findOne.mockResolvedValue(execution);

            await service.failJobExecution('exec-id', 'error');

            expect(execution.markAsFailed).toHaveBeenCalledWith('error', undefined);
            expect(execution.job.markAsFailed).toHaveBeenCalled();
            expect(executionRepository.save).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException if execution not found for complete', async () => {
            mockExecutionRepository.findOne.mockResolvedValue(null);
            await expect(service.completeJobExecution('exec-id')).rejects.toThrow('Job execution not found');
        });

        it('should throw NotFoundException if execution not found for fail', async () => {
            mockExecutionRepository.findOne.mockResolvedValue(null);
            await expect(service.failJobExecution('exec-id', 'error')).rejects.toThrow('Job execution not found');
        });
    });

    describe('updateJob', () => {
        it('should update a job', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);

            const result = await service.updateJob('job-id', { name: 'Updated' });

            expect(result.name).toBe('Updated');
            expect(jobRepository.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.updateJob('job-id', { name: 'X' })).rejects.toThrow('Job not found');
        });
    });

    describe('resumeJob (edge cases)', () => {
        it('should return job unchanged if not paused', async () => {
            const job = createMockJob({ status: JobStatus.PENDING });
            mockJobRepository.findOne.mockResolvedValue(job);

            const result = await service.resumeJob('job-id');

            expect(result.status).toBe(JobStatus.PENDING);
            expect(mockQueue.resume).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.resumeJob('job-id')).rejects.toThrow('Job not found');
        });
    });

    describe('pauseJob (edge cases)', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.pauseJob('job-id')).rejects.toThrow('Job not found');
        });
    });

    describe('cancelJob (edge cases)', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.cancelJob('job-id')).rejects.toThrow('Job not found');
        });

        it('should handle queue removal error gracefully', async () => {
            const job = createMockJob();
            mockJobRepository.findOne.mockResolvedValue(job);
            mockQueue.getJob.mockRejectedValue(new Error('Queue error'));

            await service.cancelJob('job-id');

            expect(job.markAsCancelled).toHaveBeenCalled();
            expect(jobRepository.save).toHaveBeenCalled();
        });
    });

    describe('retryJob (edge cases)', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.retryJob('job-id')).rejects.toThrow('Job not found');
        });
    });

    describe('getJobsByStatus', () => {
        it('should return jobs by status', async () => {
            const jobs = [createMockJob(), createMockJob()];
            mockJobRepository.find.mockResolvedValue(jobs);

            const result = await service.getJobsByStatus(JobStatus.PENDING);

            expect(result).toHaveLength(2);
            expect(jobRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: JobStatus.PENDING },
            }));
        });

        it('should return empty array if no jobs', async () => {
            mockJobRepository.find.mockResolvedValue([]);
            const result = await service.getJobsByStatus(JobStatus.COMPLETED);
            expect(result).toHaveLength(0);
        });
    });

    describe('getJobExecutions', () => {
        it('should return executions for a job', async () => {
            const executions = [createMockExecution()];
            mockExecutionRepository.find.mockResolvedValue(executions);

            const result = await service.getJobExecutions('job-id');

            expect(result).toHaveLength(1);
            expect(executionRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { jobId: 'job-id' },
            }));
        });
    });

    describe('getJobHistory', () => {
        it('should return execution history with limit', async () => {
            const executions = [createMockExecution()];
            mockExecutionRepository.find.mockResolvedValue(executions);

            const result = await service.getJobHistory('job-id', 10);

            expect(result).toHaveLength(1);
            expect(executionRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { jobId: 'job-id' },
                take: 10,
            }));
        });
    });

    describe('scheduleJob (edge cases)', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.scheduleJob('job-id', { cronExpression: '* * * * *', isActive: true })).rejects.toThrow('Job not found');
        });
    });

    describe('executeJob (edge cases)', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobRepository.findOne.mockResolvedValue(null);
            await expect(service.executeJob('job-id')).rejects.toThrow('Job not found');
        });
    });
});
