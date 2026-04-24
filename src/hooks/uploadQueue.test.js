// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  FB_UPLOAD_QUEUE_KEY,
  readUploadQueue,
  writeUploadQueue,
  enqueueUpload,
  removeFromUploadQueue,
} from "./uploadQueue";

describe("uploadQueue", () => {
  beforeEach(() => { localStorage.clear(); });

  it("readUploadQueue returns [] when storage is empty", () => {
    expect(readUploadQueue()).toEqual([]);
  });

  it("readUploadQueue tolerates malformed JSON without throwing", () => {
    localStorage.setItem(FB_UPLOAD_QUEUE_KEY, "{not json");
    expect(readUploadQueue()).toEqual([]);
  });

  it("writeUploadQueue persists, readUploadQueue returns it back", () => {
    const queue = [{ id: "q-1", fb: { freightBillNumber: "100" }, queuedAt: "x", attempts: 0 }];
    writeUploadQueue(queue);
    expect(readUploadQueue()).toEqual(queue);
  });

  it("enqueueUpload appends an entry with id/queuedAt/attempts and returns the id", () => {
    const id = enqueueUpload({ freightBillNumber: "100" });
    expect(id).toMatch(/^q-/);
    const q = readUploadQueue();
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe(id);
    expect(q[0].fb.freightBillNumber).toBe("100");
    expect(q[0].attempts).toBe(0);
    expect(q[0].queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("enqueueUpload preserves order across multiple calls", () => {
    enqueueUpload({ freightBillNumber: "100" });
    enqueueUpload({ freightBillNumber: "200" });
    enqueueUpload({ freightBillNumber: "300" });
    const q = readUploadQueue();
    expect(q.map((e) => e.fb.freightBillNumber)).toEqual(["100", "200", "300"]);
  });

  it("removeFromUploadQueue drops only the matching id", () => {
    const a = enqueueUpload({ freightBillNumber: "A" });
    enqueueUpload({ freightBillNumber: "B" });
    const c = enqueueUpload({ freightBillNumber: "C" });
    removeFromUploadQueue(a);
    expect(readUploadQueue().map((e) => e.fb.freightBillNumber)).toEqual(["B", "C"]);
    removeFromUploadQueue(c);
    expect(readUploadQueue().map((e) => e.fb.freightBillNumber)).toEqual(["B"]);
  });

  it("removeFromUploadQueue is a noop for unknown ids", () => {
    enqueueUpload({ freightBillNumber: "A" });
    removeFromUploadQueue("never-existed");
    expect(readUploadQueue()).toHaveLength(1);
  });
});
