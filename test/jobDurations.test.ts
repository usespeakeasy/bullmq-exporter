import assert from "node:assert/strict";
import { test } from "node:test";
import { jobDurations } from "../src/monitor/jobDurations";

test("returns completed, processed and wait durations", () => {
  assert.deepEqual(
    jobDurations({ timestamp: 1000, processedOn: 1500, finishedOn: 1800 }),
    { completed: 800, processed: 300, wait: 500 }
  );
});

for (const missing of ["processedOn", "finishedOn"] as const) {
  test(`returns undefined when ${missing} is missing`, () => {
    const job = { timestamp: 1000, processedOn: 1500, finishedOn: 1800 };
    assert.equal(jobDurations({ ...job, [missing]: undefined }), undefined);
  });
}
