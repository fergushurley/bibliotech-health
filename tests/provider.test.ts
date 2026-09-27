import { describe, it, expect, vi } from "vitest";
import {
  GBrainMemory,
  decodeResult,
  encodeMemory,
} from "../packages/gbrain-health-memory/src/index";
import type { MemoryEntry } from "../packages/core/src/index";
const entry: MemoryEntry = {
  key: "bibliotech/test/finding",
  namespace: "test",
  patientId: "jordan-taylor-synthetic",
  title: "Synthetic note",
  statement: "A source-linked question.",
  evidenceIds: ["DiagnosticReport/example"],
  sourceDates: ["2026-03-12"],
  status: "unresolved",
  lifecycle: "open",
  updatedAt: "2026-09-19T12:00:00Z",
};
function providerDouble() {
  const memory = new GBrainMemory("unit-test-only");
  Object.assign(memory, {
    connected: true,
    tools: [
      {
        name: "get_page",
        inputSchema: {
          properties: { slug: {}, include_content: {} },
          required: ["slug"],
        },
      },
      {
        name: "put_page",
        inputSchema: {
          properties: {
            slug: {},
            content: {},
            request_id: {},
            expected_revision: {},
          },
          required: ["slug", "content"],
        },
      },
    ],
  });
  return { memory, call: vi.spyOn((memory as any).client, "callTool") };
}
const missing = {
  isError: true,
  content: [{ type: "text", text: '{"error":"page_not_found"}' }],
};
describe("observed provider contract", () => {
  it("parses structured JSON separately from explanatory search text", () => {
    expect(
      decodeResult({
        content: [
          { type: "text", text: "[]" },
          { type: "text", text: "0 results. Embedding unavailable." },
        ],
      }),
    ).toEqual([]);
  });
  it("rejects a provider permission denial without claiming a write", async () => {
    const { memory, call } = providerDouble();
    call
      .mockResolvedValueOnce(missing)
      .mockResolvedValueOnce({
        isError: true,
        content: [{ type: "text", text: '{"error":"permission_denied"}' }],
      });
    await expect(memory.remember(entry)).rejects.toThrow("refused or failed");
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("rejects a write receipt when the reread does not contain the update", async () => {
    const { memory, call } = providerDouble();
    call
      .mockResolvedValueOnce(missing)
      .mockResolvedValueOnce({ content: [{ type: "text", text: "{}" }] })
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              content: encodeMemory({
                ...entry,
                updatedAt: "2026-09-18T12:00:00Z",
              }),
            }),
          },
        ],
      });
    await expect(memory.remember(entry)).rejects.toThrow(
      "could not be verified",
    );
    expect(call).toHaveBeenCalledTimes(3);
  });
});
