import assert from "node:assert/strict";
import { mock, test } from "node:test";
import logger from "../src/logger";
import { PrometheusMonitoredQueue } from "../src/monitor/promQueue";

function fakeQueue(job: object) {
  const observe = mock.fn();
  const histogram = { labels: () => ({ observe }) };
  const queue = {
    name: "emails",
    queue: { getJob: async () => job },
    metrics: {
      completedDuration: histogram,
      processedDuration: histogram,
      waitDuration: histogram,
    },
  } as unknown as PrometheusMonitoredQueue;
  return { queue, observe };
}

test("observes completed, processed and wait durations", async () => {
  const { queue, observe } = fakeQueue({
    id: "1",
    timestamp: 1000,
    processedOn: 1500,
    finishedOn: 1800,
  });
  await PrometheusMonitoredQueue.prototype.onCompleted.call(queue, {
    jobId: "1",
  });
  assert.deepEqual(
    observe.mock.calls.map((call) => call.arguments[0]),
    [800, 300, 500]
  );
});

for (const missing of ["processedOn", "finishedOn"]) {
  test(`skips and warns when ${missing} is missing`, async (t) => {
    const warn = t.mock.method(logger, "warn", (..._args: unknown[]) => logger);
    const job = {
      id: "1",
      timestamp: 1000,
      processedOn: 1500,
      finishedOn: 1800,
    };
    const { queue, observe } = fakeQueue({ ...job, [missing]: undefined });
    await PrometheusMonitoredQueue.prototype.onCompleted.call(queue, {
      jobId: "1",
    });
    assert.equal(observe.mock.callCount(), 0);
    assert.equal(warn.mock.callCount(), 1);
    assert.deepEqual(warn.mock.calls[0].arguments[1], {
      queue: "emails",
      jobId: "1",
    });
  });
}
