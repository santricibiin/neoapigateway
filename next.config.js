/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "@whiskeysockets/baileys",
        "@hapi/boom",
        "pino",
        "qrcode",
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
