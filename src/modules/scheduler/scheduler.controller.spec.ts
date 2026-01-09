import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { JobStatus, JobType } from './enums';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('SchedulerController', () => {
    let controller: SchedulerController;
    let service: SchedulerService;

    const mockSchedulerService = {
        createJob: jest.fn(),
        getJobsByStatus: jest.fn(),
        findJobById: jest.fn(),
        updateJob: jest.fn(),
        deleteJob: jest.fn(),
        scheduleJob: jest.fn(),
        executeJob: jest.fn(),
        getJobExecutions: jest.fn(),
        pauseJob: jest.fn(),
        resumeJob: jest.fn(),
        cancelJob: jest.fn(),
        retryJob: jest.fn(),
        getJobStatistics: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SchedulerController],
            providers: [
                {
                    provide: SchedulerService,
                    useValue: mockSchedulerService,
                },
            ],
        }).compile();

        controller = module.get<SchedulerController>(SchedulerController);
        service = module.get<SchedulerService>(SchedulerService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createJob', () => {
        it('should create a new job', async () => {
            const dto: CreateJobDto = {
                name: 'Test Job',
                type: JobType.NOTIFICATION,
                payload: {},
            };
            const result = { id: 'job-id', ...dto };
            mockSchedulerService.createJob.mockResolvedValue(result);

            expect(await controller.createJob(dto)).toEqual(result);
            expect(service.createJob).toHaveBeenCalledWith(dto);
        });
    });

    describe('getJobs', () => {
        it('should return all pending jobs by default', async () => {
            const jobs = [{ id: 'job-1', status: JobStatus.PENDING }];
            mockSchedulerService.getJobsByStatus.mockResolvedValue(jobs);

            const result = await controller.getJobs();
            expect(result.jobs).toEqual(jobs);
            expect(service.getJobsByStatus).toHaveBeenCalledWith(JobStatus.PENDING, 50);
        });

        it('should filter by status', async () => {
            const jobs = [{ id: 'job-1', status: JobStatus.COMPLETED }];
            mockSchedulerService.getJobsByStatus.mockResolvedValue(jobs);

            const result = await controller.getJobs(JobStatus.COMPLETED);
            expect(result.jobs).toEqual(jobs);
            expect(service.getJobsByStatus).toHaveBeenCalledWith(JobStatus.COMPLETED, 50);
        });

        it('should filter by type', async () => {
            const jobs = [
                { id: 'job-1', status: JobStatus.PENDING, type: JobType.NOTIFICATION },
                { id: 'job-2', status: JobStatus.PENDING, type: JobType.CLEANUP }
            ];
            mockSchedulerService.getJobsByStatus.mockResolvedValue(jobs);

            const result = await controller.getJobs(undefined, JobType.NOTIFICATION);
            expect(result.jobs).toHaveLength(1);
            expect(result.jobs[0].type).toBe(JobType.NOTIFICATION);
        });
    });

    describe('getJob', () => {
        it('should return a job', async () => {
            const job = { id: 'job-id' };
            mockSchedulerService.findJobById.mockResolvedValue(job);

            expect(await controller.getJob('job-id')).toEqual(job);
            expect(service.findJobById).toHaveBeenCalledWith('job-id');
        });

        it('should throw 404 if job not found', async () => {
            mockSchedulerService.findJobById.mockResolvedValue(null);

            await expect(controller.getJob('job-id')).rejects.toThrow(HttpException);
            await expect(controller.getJob('job-id')).rejects.toThrow('Job not found');
        });
    });

    describe('updateJob', () => {
        it('should update a job', async () => {
            const dto: UpdateJobDto = { priority: 2 };
            const result = { id: 'job-id', ...dto };
            mockSchedulerService.updateJob.mockResolvedValue(result);

            expect(await controller.updateJob('job-id', dto)).toEqual(result);
            expect(service.updateJob).toHaveBeenCalledWith('job-id', dto);
        });
    });

    describe('deleteJob', () => {
        it('should delete a job', async () => {
            mockSchedulerService.deleteJob.mockResolvedValue(undefined);

            expect(await controller.deleteJob('job-id')).toEqual({ message: 'Job deleted successfully' });
            expect(service.deleteJob).toHaveBeenCalledWith('job-id');
        });
    });

    describe('scheduleJob', () => {
        it('should schedule a job', async () => {
            const dto: CreateScheduleDto = { cronExpression: '* * * * *' };
            const result = { id: 'schedule-id', ...dto };
            mockSchedulerService.scheduleJob.mockResolvedValue(result);

            expect(await controller.scheduleJob('job-id', dto)).toEqual(result);
            expect(service.scheduleJob).toHaveBeenCalledWith('job-id', dto);
        });
    });

    describe('executeJob', () => {
        it('should execute a job', async () => {
            const result = { id: 'execution-id' };
            mockSchedulerService.executeJob.mockResolvedValue(result);

            expect(await controller.executeJob('job-id')).toEqual(result);
            expect(service.executeJob).toHaveBeenCalledWith('job-id');
        });
    });

    describe('getJobExecutions', () => {
        it('should get executions', async () => {
            const result = [{ id: 'execution-id' }];
            mockSchedulerService.getJobExecutions.mockResolvedValue(result);

            expect(await controller.getJobExecutions('job-id')).toEqual(result);
            expect(service.getJobExecutions).toHaveBeenCalledWith('job-id');
        });
    });

    describe('lifecycle methods', () => {
        it('should pause job', async () => {
            mockSchedulerService.pauseJob.mockResolvedValue({ status: JobStatus.PAUSED });
            expect(await controller.pauseJob('job-id')).toEqual({ status: JobStatus.PAUSED });
        });

        it('should resume job', async () => {
            mockSchedulerService.resumeJob.mockResolvedValue({ status: JobStatus.PENDING });
            expect(await controller.resumeJob('job-id')).toEqual({ status: JobStatus.PENDING });
        });

        it('should cancel job', async () => {
            mockSchedulerService.cancelJob.mockResolvedValue({ status: JobStatus.CANCELLED });
            expect(await controller.cancelJob('job-id')).toEqual({ status: JobStatus.CANCELLED });
        });

        it('should retry job', async () => {
            mockSchedulerService.retryJob.mockResolvedValue({ status: JobStatus.PENDING });
            expect(await controller.retryJob('job-id')).toEqual({ status: JobStatus.PENDING });
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            const stats = { [JobStatus.PENDING]: 10 };
            mockSchedulerService.getJobStatistics.mockResolvedValue(stats);
            expect(await controller.getStatistics()).toEqual(stats);
        });
    });
});
