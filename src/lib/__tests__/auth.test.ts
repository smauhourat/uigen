// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockSet })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function callCreateSession(userId: string, email: string) {
  const { createSession } = await import("@/lib/auth");
  await createSession(userId, email);
}

test("sets auth-token cookie with correct name", async () => {
  await callCreateSession("user-1", "test@example.com");
  expect(mockSet.mock.calls[0][0]).toBe("auth-token");
});

test("sets a non-empty JWT string as the cookie value", async () => {
  await callCreateSession("user-1", "test@example.com");
  const token = mockSet.mock.calls[0][1];
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
});

test("sets httpOnly: true on the cookie", async () => {
  await callCreateSession("user-1", "test@example.com");
  const options = mockSet.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
});

test("sets sameSite: lax on the cookie", async () => {
  await callCreateSession("user-1", "test@example.com");
  const options = mockSet.mock.calls[0][2];
  expect(options.sameSite).toBe("lax");
});

test("sets path: / on the cookie", async () => {
  await callCreateSession("user-1", "test@example.com");
  const options = mockSet.mock.calls[0][2];
  expect(options.path).toBe("/");
});

test("sets secure: false in test environment", async () => {
  await callCreateSession("user-1", "test@example.com");
  const options = mockSet.mock.calls[0][2];
  expect(options.secure).toBe(false);
});

test("sets secure: true in production environment", async () => {
  const original = process.env.NODE_ENV;
  // @ts-expect-error NODE_ENV is readonly in types but assignable at runtime
  process.env.NODE_ENV = "production";
  try {
    vi.resetModules();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");
    const options = mockSet.mock.calls[0][2];
    expect(options.secure).toBe(true);
  } finally {
    // @ts-expect-error
    process.env.NODE_ENV = original;
    vi.resetModules();
  }
});

test("sets expires approximately 7 days from now", async () => {
  const before = Date.now();
  await callCreateSession("user-1", "test@example.com");
  const after = Date.now();

  const options = mockSet.mock.calls[0][2];
  const expires: Date = options.expires;
  expect(expires).toBeInstanceOf(Date);

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const toleranceMs = 5000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - toleranceMs);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + toleranceMs);
});

test("JWT payload contains correct userId and email", async () => {
  const userId = "user-42";
  const email = "hello@example.com";
  await callCreateSession(userId, email);

  const token = mockSet.mock.calls[0][1];
  const secret = new TextEncoder().encode("development-secret-key");
  const { payload } = await jwtVerify(token, secret);

  expect(payload.userId).toBe(userId);
  expect(payload.email).toBe(email);
});
