/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PUBLIC_API_BASE: process.env.PUBLIC_API_BASE || "http://localhost:3000",
  },
};

module.exports = nextConfig;
