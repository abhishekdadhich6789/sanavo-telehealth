import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone is for Docker/VPS. Railway Nixpacks uses `next start`.
  serverExternalPackages: ["better-sqlite3", "@prisma/client", "prisma"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
