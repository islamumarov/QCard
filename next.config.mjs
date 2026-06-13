import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module — keep it out of the bundler so the
  // .node binary is loaded at runtime instead of being traced/inlined.
  serverExternalPackages: ["better-sqlite3"],
  // Pin the tracing root to this project (a lockfile higher up the tree
  // would otherwise be picked as the inferred workspace root).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
