import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['keyv', '@keyv/redis', '@keyv/mongo', '@keyv/sqlite', '@keyv/postgres', '@keyv/mysql', '@keyv/etcd', '@keyv/offline', '@keyv/tiered'],
};

export default nextConfig;
