const { promises: fs } = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TOKENS = [
  "conit",
  "CONIT",
  "Conit",
  "6368",
  "006368",
  "SDC",
  "Staranzano",
  "Monfalcone",
  "Fincantieri",
];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);

async function scan(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const violations = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      violations.push(...(await scan(entryPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    const relPath = path.relative(ROOT, entryPath);
    let content;
    try {
      content = await fs.readFile(entryPath, "utf-8");
    } catch (error) {
      try {
        content = await fs.readFile(entryPath);
        content = content.toString("latin1");
      } catch {
        continue;
      }
    }
    for (const token of TOKENS) {
      if (content.includes(token)) {
        violations.push({ token, file: relPath });
      }
    }
  }
  return violations;
}

(async () => {
  const violations = await scan(ROOT);
  if (violations.length) {
    console.error("conit guard: forbidden token detected");
    for (const violation of violations) {
      console.error(`- ${violation.file} -> ${violation.token}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("conit guard: no forbidden tokens detected");
})();
