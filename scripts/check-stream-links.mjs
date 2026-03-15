import fs from "fs";
import path from "path";
import { getLinkHealthSnapshot } from "../lib/linkHealth.js";

function getArgValue(prefix) {
  const arg = process.argv.find((item) => item.startsWith(`${prefix}=`));
  if (!arg) return "";
  return arg.slice(prefix.length + 1).trim();
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

async function main() {
  const max = parsePositiveInt(getArgValue("--max"));
  const failOnError = hasFlag("--fail-on-error");
  const outArg = getArgValue("--out");
  const reportPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(process.cwd(), "tmp_link_health_report.json");

  const snapshot = await getLinkHealthSnapshot({
    force: true,
    maxChannels: max,
  });

  fs.writeFileSync(reportPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Link check completed: ${snapshot.okCount}/${snapshot.checkedCount} OK`);
  console.log(`Success rate: ${snapshot.successRate}%`);
  console.log(`Report: ${reportPath}`);

  if (snapshot.failCount > 0) {
    const sample = snapshot.channels
      .filter((item) => !item.ok)
      .slice(0, 10)
      .map((item) => item.channelId)
      .join(", ");
    console.log(`Failing sample: ${sample || "-"}`);
  }

  if (failOnError && snapshot.failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Link check failed:", error?.message || error);
  process.exit(1);
});
