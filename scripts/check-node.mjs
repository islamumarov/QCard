// Preflight guard: better-sqlite3 is a native module compiled against one
// Node ABI at install time. Running under a different Node major prints a
// cryptic ERR_DLOPEN_FAILED. Fail early with the actual fix instead.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [major] = process.versions.node.split(".").map(Number);

if (major < 18) {
  console.error(
    `\n✗ Node ${process.versions.node} is too old. Next.js needs >=18.18.\n` +
      `  Run:  nvm use            (reads .nvmrc -> 22.21.1)\n`,
  );
  process.exit(1);
}

// Confirm the compiled binary matches THIS Node's ABI. The native addon is
// dlopen'd lazily on first DB open, so actually open one to force it.
try {
  const Database = require("better-sqlite3");
  new Database(":memory:").close();
} catch (err) {
  if (err && err.code === "ERR_DLOPEN_FAILED") {
    console.error(
      `\n✗ better-sqlite3 was built for a different Node version than the one running now (${process.versions.node}).\n` +
        `  Fix with either:\n` +
        `    nvm use                       # switch to the Node in .nvmrc (22.21.1)\n` +
        `    npm rebuild better-sqlite3    # or rebuild for the current Node\n`,
    );
    process.exit(1);
  }
  throw err;
}
