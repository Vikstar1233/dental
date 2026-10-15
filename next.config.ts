import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pins the project root so Turbopack doesn't walk up to an unrelated
    // package-lock.json in the parent (home) directory.
    root: path.join(__dirname),
  },
};

export default nextConfig;
