import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/articles", destination: "/ru/articles", permanent: true },
      { source: "/stories", destination: "/ru/stories", permanent: true },
      { source: "/books", destination: "/ru/books", permanent: true },
      { source: "/plays", destination: "/ru/plays", permanent: true },
      { source: "/video", destination: "/ru/video", permanent: true },
      { source: "/videos", destination: "/ru/video", permanent: true },
      { source: "/glossary", destination: "/ru/glossary", permanent: true },
      {
        source: "/presentations",
        destination: "/ru/presentations",
        permanent: true,
      },
      {
        source: "/consulting",
        destination: "/ru/consulting",
        permanent: true,
      },
    ];
  },
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
