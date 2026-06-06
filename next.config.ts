import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep drizzle-orm (and the postgres driver) as a single external server module rather than letting
  // the bundler split it across chunks. src/lib/cardinality.ts patches QueryPromise.prototype once; if
  // drizzle-orm were bundled into multiple copies the patch would only land on one and `.single()` etc.
  // would be "not a function" at runtime in production.
  serverExternalPackages: ["drizzle-orm", "postgres"],
};

export default nextConfig;
