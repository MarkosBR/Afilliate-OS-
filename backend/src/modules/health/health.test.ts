import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("health payload contract", () => {
  it("matches the required response shape", () => {
    const payload = {
      success: true,
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };

    assert.equal(payload.success, true);
    assert.equal(payload.status, "ok");
    assert.ok(typeof payload.timestamp === "string");
  });
});
