import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { JobExecution } from '../../scheduler/entities/job-execution.entity';
import { JobProcessor, JobData } from './job.processor';
import { EmailJobHandler } from '../handlers/email-job.handler';
import { NotificationJobHandler } from '../handlers/notification-job.handler';
import { WebhookJobHandler } from '../handlers/webhook-job.handler';

@Processor('priority')
export class PriorityJobProcessor extends JobProcessor {
  protected readonly logger = new Logger(PriorityJobProcessor.name);

  constructor(
    @InjectRepository(JobExecution)
    executionRepository: Repository<JobExecution>,
    emailHandler: EmailJobHandler,
    notificationHandler: NotificationJobHandler,
    webhookHandler: WebhookJobHandler,
  ) {
    super(executionRepository, emailHandler, notificationHandler, webhookHandler);
  }

  async process(job: Job<JobData>): Promise<any> {
    this.logger.log(`Processing PRIORITY job: ${job.id}`);
    return super.process(job);
  }
}
