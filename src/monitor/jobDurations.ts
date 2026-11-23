import type { Job } from "bullmq";

export interface JobDurations {
  completed: number;
  processed: number;
  wait: number;
}

export function jobDurations({
  timestamp,
  processedOn = NaN,
  finishedOn = NaN,
}: Pick<Job, "timestamp" | "processedOn" | "finishedOn">):
  | JobDurations
  | undefined {
  const durations = {
    completed: finishedOn - timestamp,
    processed: finishedOn - processedOn,
    wait: processedOn - timestamp,
  };
  return Object.values(durations).every(Number.isFinite)
    ? durations
    : undefined;
}
