import { Schedule } from './schedule.entity';
import { ScheduleStatus } from '../enums';

describe('Schedule Entity', () => {
    const createSchedule = (overrides: Partial<Schedule> = {}): Schedule => {
        const schedule = new Schedule();
        schedule.id = 'schedule-id';
        schedule.jobId = 'job-id';
        schedule.cronExpression = '* * * * *';
        schedule.isActive = true;
        schedule.status = ScheduleStatus.ACTIVE;
        schedule.executionCount = 0;
        schedule.maxExecutions = null;
        schedule.timezone = 'UTC';
        schedule.metadata = {};
        Object.assign(schedule, overrides);
        return schedule;
    };

    describe('isScheduleActive', () => {
        it('should return true for active schedule', () => {
            const schedule = createSchedule();
            expect(schedule.isScheduleActive()).toBe(true);
        });

        it('should return false if isActive is false', () => {
            const schedule = createSchedule({ isActive: false });
            expect(schedule.isScheduleActive()).toBe(false);
        });

        it('should return false if status is not ACTIVE', () => {
            const schedule = createSchedule({ status: ScheduleStatus.PAUSED });
            expect(schedule.isScheduleActive()).toBe(false);
        });

        it('should return false if startAt is in the future', () => {
            const schedule = createSchedule({
                startAt: new Date(Date.now() + 86400000),
            });
            expect(schedule.isScheduleActive()).toBe(false);
        });

        it('should return false if endAt is in the past', () => {
            const schedule = createSchedule({
                endAt: new Date(Date.now() - 86400000),
            });
            expect(schedule.isScheduleActive()).toBe(false);
        });

        it('should return false if max executions reached', () => {
            const schedule = createSchedule({
                maxExecutions: 5,
                executionCount: 5,
            });
            expect(schedule.isScheduleActive()).toBe(false);
        });
    });

    describe('shouldExecuteNow', () => {
        it('should return false if schedule not active', () => {
            const schedule = createSchedule({ isActive: false });
            schedule.nextExecution = new Date(Date.now() - 1000);
            expect(schedule.shouldExecuteNow()).toBe(false);
        });

        it('should return true if nextExecution is in the past', () => {
            const schedule = createSchedule();
            schedule.nextExecution = new Date(Date.now() - 1000);
            expect(schedule.shouldExecuteNow()).toBe(true);
        });

        it('should return false if no nextExecution', () => {
            const schedule = createSchedule();
            schedule.nextExecution = null;
            expect(schedule.shouldExecuteNow()).toBe(false);
        });
    });

    describe('recordExecution', () => {
        it('should increment execution count and set lastExecution', () => {
            const schedule = createSchedule();
            schedule.recordExecution();

            expect(schedule.executionCount).toBe(1);
            expect(schedule.lastExecution).toBeInstanceOf(Date);
        });

        it('should set EXPIRED status when max reached', () => {
            const schedule = createSchedule({
                maxExecutions: 1,
                executionCount: 0,
            });
            schedule.recordExecution();

            expect(schedule.status).toBe(ScheduleStatus.EXPIRED);
            expect(schedule.isActive).toBe(false);
            expect(schedule.nextExecution).toBeNull();
        });
    });

    describe('pause', () => {
        it('should set status to PAUSED', () => {
            const schedule = createSchedule();
            schedule.pause();

            expect(schedule.status).toBe(ScheduleStatus.PAUSED);
            expect(schedule.isActive).toBe(false);
        });
    });

    describe('resume', () => {
        it('should resume if paused', () => {
            const schedule = createSchedule({ status: ScheduleStatus.PAUSED, isActive: false });
            schedule.resume();

            expect(schedule.status).toBe(ScheduleStatus.ACTIVE);
            expect(schedule.isActive).toBe(true);
        });

        it('should not change status if not paused', () => {
            const schedule = createSchedule({ status: ScheduleStatus.EXPIRED });
            schedule.resume();

            expect(schedule.status).toBe(ScheduleStatus.EXPIRED);
        });
    });

    describe('deactivate', () => {
        it('should set status to INACTIVE', () => {
            const schedule = createSchedule();
            schedule.deactivate();

            expect(schedule.status).toBe(ScheduleStatus.INACTIVE);
            expect(schedule.isActive).toBe(false);
            expect(schedule.nextExecution).toBeNull();
        });
    });

    describe('updateCronExpression', () => {
        it('should update cron expression', () => {
            const schedule = createSchedule();
            schedule.updateCronExpression('0 * * * *');
            expect(schedule.cronExpression).toBe('0 * * * *');
        });
    });

    describe('updateTimezone', () => {
        it('should update timezone', () => {
            const schedule = createSchedule();
            schedule.updateTimezone('America/New_York');
            expect(schedule.timezone).toBe('America/New_York');
        });
    });

    describe('setExecutionWindow', () => {
        it('should set startAt and endAt', () => {
            const schedule = createSchedule();
            const start = new Date();
            const end = new Date(Date.now() + 86400000);

            schedule.setExecutionWindow(start, end);

            expect(schedule.startAt).toBe(start);
            expect(schedule.endAt).toBe(end);
        });

        it('should deactivate if window makes schedule inactive', () => {
            const schedule = createSchedule();
            schedule.setExecutionWindow(undefined, new Date(Date.now() - 86400000));

            expect(schedule.status).toBe(ScheduleStatus.INACTIVE);
        });

        it('should set null if params not provided', () => {
            const schedule = createSchedule({ startAt: new Date(), endAt: new Date() });
            schedule.setExecutionWindow();

            expect(schedule.startAt).toBeNull();
            expect(schedule.endAt).toBeNull();
        });
    });

    describe('setMaxExecutions', () => {
        it('should set maxExecutions', () => {
            const schedule = createSchedule();
            schedule.setMaxExecutions(10);
            expect(schedule.maxExecutions).toBe(10);
        });

        it('should expire if already exceeded', () => {
            const schedule = createSchedule({ executionCount: 5 });
            schedule.setMaxExecutions(3);

            expect(schedule.status).toBe(ScheduleStatus.EXPIRED);
            expect(schedule.isActive).toBe(false);
        });

        it('should set null if not provided', () => {
            const schedule = createSchedule({ maxExecutions: 10 });
            schedule.setMaxExecutions();
            expect(schedule.maxExecutions).toBeNull();
        });
    });

    describe('getExecutionProgress', () => {
        it('should return 0 if no maxExecutions', () => {
            const schedule = createSchedule();
            expect(schedule.getExecutionProgress()).toBe(0);
        });

        it('should return percentage', () => {
            const schedule = createSchedule({ maxExecutions: 10, executionCount: 3 });
            expect(schedule.getExecutionProgress()).toBe(30);
        });

        it('should cap at 100', () => {
            const schedule = createSchedule({ maxExecutions: 5, executionCount: 10 });
            expect(schedule.getExecutionProgress()).toBe(100);
        });
    });

    describe('getTimeUntilNextExecution', () => {
        it('should return null if no nextExecution', () => {
            const schedule = createSchedule();
            schedule.nextExecution = null;
            expect(schedule.getTimeUntilNextExecution()).toBeNull();
        });

        it('should return time in ms', () => {
            const schedule = createSchedule();
            schedule.nextExecution = new Date(Date.now() + 5000);
            const time = schedule.getTimeUntilNextExecution();
            expect(time).toBeGreaterThan(4000);
            expect(time).toBeLessThan(6000);
        });

        it('should return 0 if nextExecution is in the past', () => {
            const schedule = createSchedule();
            schedule.nextExecution = new Date(Date.now() - 1000);
            expect(schedule.getTimeUntilNextExecution()).toBe(0);
        });
    });

    describe('isExpired', () => {
        it('should return true if status is EXPIRED', () => {
            const schedule = createSchedule({ status: ScheduleStatus.EXPIRED });
            expect(schedule.isExpired()).toBe(true);
        });

        it('should return true if endAt passed', () => {
            const schedule = createSchedule({
                endAt: new Date(Date.now() - 1000),
            });
            expect(schedule.isExpired()).toBe(true);
        });

        it('should return true if max executions reached', () => {
            const schedule = createSchedule({
                maxExecutions: 5,
                executionCount: 5,
            });
            expect(schedule.isExpired()).toBe(true);
        });

        it('should return false for active schedule', () => {
            const schedule = createSchedule();
            expect(schedule.isExpired()).toBe(false);
        });
    });

    describe('getRemainingExecutions', () => {
        it('should return null if no maxExecutions', () => {
            const schedule = createSchedule();
            expect(schedule.getRemainingExecutions()).toBeNull();
        });

        it('should return remaining count', () => {
            const schedule = createSchedule({ maxExecutions: 10, executionCount: 3 });
            expect(schedule.getRemainingExecutions()).toBe(7);
        });

        it('should return 0 if exceeded', () => {
            const schedule = createSchedule({ maxExecutions: 5, executionCount: 10 });
            expect(schedule.getRemainingExecutions()).toBe(0);
        });
    });
});
