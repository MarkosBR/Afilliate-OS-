import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginSchema, registerSchema } from "./auth.schemas.js";

describe("auth schemas", () => {
  it("rejects unmatched passwords", () => {
    const result = registerSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "password1",
      confirmPassword: "password2",
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid registration payload", () => {
    const result = registerSchema.parse({
      name: "Ada",
      email: "ADA@example.com",
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(result.email, "ada@example.com");
  });

  it("requires an email on login", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "password1" });
    assert.equal(result.success, false);
  });
});
