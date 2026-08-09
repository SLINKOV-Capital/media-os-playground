import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vfuncmvfcswsbgvmkrsu.supabase.co",
        pathname: "/storage/v1/object/public/document-images/**",
      },
    ],
  },
};

export default nextConfig;
