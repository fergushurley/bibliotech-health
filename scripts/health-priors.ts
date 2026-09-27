import { workflow } from "../packages/core/src/workflow";
try {
  const command = process.argv[2] ?? "prepare";
  let result;
  switch (command) {
    case "prepare":
      result = await workflow.prepareVisit();
      break;
    case "import":
      result = await workflow.importFollowUp();
      break;
    case "fresh":
      result = await workflow.freshSession();
      break;
    case "recall":
      result = await workflow.recallMemory();
      break;
    case "retry":
      result = await workflow.retryMemory();
      break;
    case "reset":
      result = await workflow.resetDemo();
      break;
    default:
      throw new Error("Commands: prepare, import, fresh, recall, retry, reset");
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Workflow failed");
  process.exitCode = 1;
}
