import { describe, expect, it, vi } from "vitest";
import {
  SessionStore,
  type StorageBackend,
} from "../apps/web/cloudflare/store";
import { handleApi, sessionCookie, type Env } from "../apps/web/cloudflare/api";

class TestStorage implements StorageBackend {
  values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.values.get(key)) as T | undefined;
  }
  async put<T>(key: string, value: T) {
    this.values.set(key, structuredClone(value));
  }
}

describe("public demo state", () => {
  it("isolates visitors and restores a visitor after object recreation", async () => {
    const disk = new TestStorage();
    const first = new SessionStore(disk);
    const other = new SessionStore(new TestStorage());
    const original = await first.read();
    await first.transaction((s) => {
      s.imported = true;
    });
    const resumed = await new SessionStore(disk).read();
    expect(resumed.namespace).toBe(original.namespace);
    expect(resumed.imported).toBe(true);
    expect((await other.read()).namespace).not.toBe(original.namespace);
    expect((await other.read()).imported).toBe(false);
  });

  it("serializes concurrent changes and recovers after a failed change", async () => {
    const store = new SessionStore(new TestStorage());
    await expect(
      store.transaction((s) => {
        s.imported = true;
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect((await store.read()).imported).toBe(false);
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        store.transaction(async (s) => {
          await Promise.resolve();
          s.resources.push({ resourceType: "Observation", id: `test-${i}` });
        }),
      ),
    );
    expect((await store.read()).resources).toHaveLength(35);
  });
});

describe("public demo request boundary", () => {
  function setup() {
    const fetchSession = vi.fn(async () => Response.json({ ok: true }));
    const idFromName = vi.fn((name: string) => name);
    const env = {
      DEMO_SESSIONS: { idFromName, get: () => ({ fetch: fetchSession }) },
    } as unknown as Env;
    return { env, idFromName, fetchSession };
  }
  const token = "a".repeat(64);
  const cookie = `__Host-bibliotech-demo=${token}`;

  it("rejects cross-origin and missing-origin writes before accessing storage", async () => {
    const { env, idFromName } = setup();
    for (const origin of [undefined, "https://evil.example"]) {
      const headers = new Headers({
        Cookie: cookie,
        "Content-Type": "application/json",
      });
      if (origin) headers.set("Origin", origin);
      const response = await handleApi(
        new Request("https://www.biblio.tech/api/actions", {
          method: "POST",
          headers,
          body: '{"action":"prepare"}',
        }),
        env,
      );
      expect(response.status).toBe(403);
    }
    expect(idFromName).not.toHaveBeenCalled();
  });

  it("requires a session for mutations and JSON content", async () => {
    const { env, idFromName } = setup();
    for (const [contentType, expected] of [
      ["text/plain", 415],
      ["application/json", 401],
    ] as const) {
      const response = await handleApi(
        new Request("https://www.biblio.tech/api/actions", {
          method: "POST",
          headers: {
            Origin: "https://www.biblio.tech",
            "Content-Type": contentType,
          },
          body: "{}",
        }),
        env,
      );
      expect(response.status).toBe(expected);
    }
    expect(idFromName).not.toHaveBeenCalled();
  });

  it("issues an unguessable secure cookie and prevents API caching", async () => {
    const { env, idFromName } = setup();
    const response = await handleApi(
      new Request("https://www.biblio.tech/api/state"),
      env,
    );
    expect(idFromName.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get("set-cookie")).toMatch(
      /Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400/,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects ambiguous cookies and cross-site reads", async () => {
    expect(
      sessionCookie(
        new Request("https://www.biblio.tech", {
          headers: { Cookie: `${cookie}; ${cookie}` },
        }),
      ),
    ).toBeUndefined();
    const { env, idFromName } = setup();
    const response = await handleApi(
      new Request("https://www.biblio.tech/api/state", {
        headers: { "Sec-Fetch-Site": "cross-site" },
      }),
      env,
    );
    expect(response.status).toBe(403);
    expect(idFromName).not.toHaveBeenCalled();
  });
});
