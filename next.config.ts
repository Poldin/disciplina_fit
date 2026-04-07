import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Riduce attese su navigazione indietro/avanti: riuso payload RSC in cache (secondi). */
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 180,
    },
  },
};

export default nextConfig;
