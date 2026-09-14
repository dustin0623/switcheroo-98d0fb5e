import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // @/* alias is resolved through tsconfig.json paths → ./*  (project root)
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
