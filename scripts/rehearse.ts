import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
async function act(action: string, id?: string) {
  const response = await fetch(`${base}/api/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ action, id }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, data.error);
  return data.result;
}
async function state() {
  return (await fetch(`${base}/api/state`)).json();
}
for (let round = 1; round <= 2; round++) {
  await act("reset");
  const before = await state();
  const first = await act("prepare");
  assert.equal(first.findings.length, 3);
  assert.equal(first.memoryStatus, "connected", first.memoryMessage);
  for (const finding of first.findings) {
    assert.ok(finding.evidenceIds.length);
    for (const id of finding.evidenceIds)
      assert.ok(before.evidence.some((e: any) => e.id === id));
    const page = await fetch(`${base}/insights/${finding.id}`);
    assert.equal(page.status, 200);
  }
  const imported = await act("import");
  assert.equal(imported.synced, true, imported.error);
  const after = await state();
  assert.ok(
    after.memory.some(
      (m: any) => m.lifecycle === "resolved" && m.providerId && m.recalledAt,
    ),
  );
  const namespace = after.namespace;
  const session = after.sessionId;
  await act("fresh");
  const fresh = await state();
  assert.equal(fresh.namespace, namespace);
  assert.notEqual(fresh.sessionId, session);
  assert.equal(fresh.brief, undefined);
  assert.ok(
    fresh.access.some(
      (e: any) =>
        e.runId.startsWith("fresh-") &&
        e.actor === "GBrain · search" &&
        e.result === "allowed",
    ),
  );
  assert.ok(fresh.memory.some((m: any) => m.lifecycle === "resolved"));
  const second = await act("prepare");
  assert.equal(second.memoryStatus, "connected", second.memoryMessage);
  assert.equal(second.findings.length, 2);
  assert.ok(second.memoryUsed.some((m: any) => m.lifecycle === "resolved"));
  console.log(`Live rehearsal ${round}: passed, namespace ${namespace}`);
}
const fixed = JSON.stringify((await state()).evidence);
const marked = await act("review", "longitudinal-measurements");
assert.equal(marked.synced, true, marked.error);
await act("fresh");
const remembered = await act("prepare");
assert.equal(JSON.stringify((await state()).evidence), fixed);
assert.ok(remembered.previouslyReviewed.includes("Bring the longer view"));
assert.equal(remembered.findings.length, 1);
console.log("Fixed FHIR / remembered review contribution: passed");
await act("reset");
await act("prepare");
console.log("Demo restored to a prepared initial brief.");
