import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process task reminders daily at 9 AM Malaysia time (1 AM UTC)
crons.daily(
  "process-task-reminders",
  { hourUTC: 1, minuteUTC: 0 },
  internal.tasks.processReminders
);

// Generate recurring tasks daily at midnight Malaysia time (4 PM UTC previous day)
crons.daily(
  "generate-recurring-tasks",
  { hourUTC: 16, minuteUTC: 0 },
  internal.taskTemplates.generateRecurringTasks
);

// Publish scheduled announcements hourly
crons.hourly(
  "publish-scheduled-announcements",
  { minuteUTC: 0 },
  internal.announcements.publishScheduled
);

export default crons;
