import * as bullmq from "bullmq";
import { PrometheusMetrics } from "./promMetricsCollector";
import { jobDurations } from "./jobDurations";
import logger from "../logger";

interface MonitoredQueueOptions {
  bullmqOpts: bullmq.QueueBaseOptions;
  name: string;
  metricsPrefix?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @see https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/api/bullmq.queueeventslistener.md
 */
export class PrometheusMonitoredQueue extends bullmq.QueueEvents {
  metrics: PrometheusMetrics;
  queue: bullmq.Queue;
  canceled = false;

  constructor(
    name: string,
    metrics: PrometheusMetrics,
    opts: MonitoredQueueOptions
  ) {
    super(name, opts.bullmqOpts);
    this.queue = new bullmq.Queue(name, opts.bullmqOpts);
    this.metrics = metrics;
    this.on("completed", this.onCompleted);
    this.loop(2000);
  }

  async onCompleted(completedJob: { jobId: string }) {
    const job = await this.queue.getJob(completedJob.jobId);
    if (!job) {
      return;
    }

    const durations = jobDurations(job);
    if (!durations) {
      logger.warn("Skipping duration metrics for a job without timestamps", {
        queue: this.name,
        jobId: job.id,
      });
      return;
    }
    this.metrics.completedDuration
      .labels({ queue: this.name })
      .observe(durations.completed);
    this.metrics.processedDuration
      .labels({ queue: this.name })
      .observe(durations.processed);
    this.metrics.waitDuration
      .labels({ queue: this.name })
      .observe(durations.wait);
  }

  async loop(ms = 5000) {
    while (this.canceled === false) {
      await this.updateGauges();
      await sleep(ms);
    }
    console.log("Stopped updating gauges for " + this.name);
  }

  async updateGauges() {
    const { completed, active, delayed, failed, waiting } =
      await this.queue.getJobCounts();
    this.metrics.activeGauge.labels({ queue: this.name }).set(active);
    this.metrics.completedGauge.labels({ queue: this.name }).set(completed);
    this.metrics.delayedGauge.labels({ queue: this.name }).set(delayed);
    this.metrics.failedGauge.labels({ queue: this.name }).set(failed);
    this.metrics.waitingGauge.labels({ queue: this.name }).set(waiting);
  }

  async close() {
    this.canceled = true;
    await super.close();
    await this.queue.close();
  }
}
