import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
    unoptimized: true, 
  },
  
  
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/uploads/:path*",
          destination: "https://onboarding-apis.app.f2c.io/uploads/:path*", 
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
