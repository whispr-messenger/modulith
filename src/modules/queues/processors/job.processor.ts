import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { JobExecution } from '../../scheduling/entities/job-execution.entity';
import { ExecutionStatus } from '../../scheduling/enums';
import { EmailJobHandler } from '../handlers/email-job.handler';
import { NotificationJobHandler } from '../handlers/notification-job.handler';
import { WebhookJobHandler } from '../handlers/webhook-job.handler';
import { JobHandler } from '../handlers/base-job.handler';

export interface JobData {
  id: string;
  type: string;
  payload: Record<string, any>;
  jobId?: string;
  scheduleId?: string;
  attemptNumber?: number;
}

@Processor('scheduler')
export class JobProcessor extends WorkerHost {
  protected readonly logger = new Logger(JobProcessor.name);
  protected readonly handlers: Map<string, JobHandler>;

  constructor(
    @InjectRepository(JobExecution)
    private readonly executionRepository: Repository<JobExecution>,
    private readonly emailHandler: EmailJobHandler,
    private readonly notificationHandler: NotificationJobHandler,
    private readonly webhookHandler: WebhookJobHandler,
  ) {
    super();
    this.handlers = new Map<string, JobHandler>();
    this.handlers.set('email', this.emailHandler);
    this.handlers.set('notification', this.notificationHandler);
    this.handlers.set('webhook', this.webhookHandler);
    this.handlers.set('push_notification', this.notificationHandler);
    this.handlers.set('sms', this.notificationHandler);
  }

  async process(job: Job<JobData>): Promise<any> {
    const startTime = Date.now();
    const { type, payload, jobId, attemptNumber = 1 } = job.data;

    this.logger.log(`Processing job: ${job.id} | Type: ${type} | Attempt: ${attemptNumber}`);

    // Create execution record
    const execution = await this.createExecution(jobId || job.data.id, attemptNumber);

    try {
      // Get handler for this job type
      const handler = this.handlers.get(type);

      if (!handler) {
        throw new Error(`No handler found for job type: ${type}`);
      }

      // Execute the job
      const result = await handler.execute(payload);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Update execution as completed
      await this.completeExecution(execution.id, result, durationMs);

      this.logger.log(`Job ${job.id} completed successfully in ${durationMs}ms`);

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Update execution as failed
      await this.failExecution(execution.id, error, durationMs);

      this.logger.error(`Job ${job.id} failed after ${durationMs}ms: ${error.message}`);

      throw error;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed with result:`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }

  // Private helper methods

  private async createExecution(jobId: string, attemptNumber: number): Promise<JobExecution> {
    const execution = this.executionRepository.create({
      jobId,
      status: ExecutionStatus.RUNNING,
      retryAttempt: attemptNumber,
      startedAt: new Date(),
      workerId: process.pid.toString(),
    });
    return this.executionRepository.save(execution);
  }

  private async completeExecution(
    executionId: string,
    result: any,
    durationMs: number,
  ): Promise<void> {
    await this.executionRepository.update(executionId, {
      status: ExecutionStatus.COMPLETED,
      completedAt: new Date(),
      output: JSON.stringify(result),
      durationMs,
    });
  }

  private async failExecution(
    executionId: string,
    error: Error,
    durationMs: number,
  ): Promise<void> {
    const errorDetails = {
      name: error.name,
      stack: error.stack || '',
    };

    await this.executionRepository.update(executionId, {
      status: ExecutionStatus.FAILED,
      completedAt: new Date(),
      errorMessage: error.message,
      errorDetails: errorDetails as any,
      durationMs,
    });
  }
}
