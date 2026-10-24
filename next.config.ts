import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets Tailwind CSS run through Turbopack (kept from the project generator).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
