const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const redirects = [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.usamissionaries.org",
          },
        ],
        destination: "https://usamissionaries.org/:path*",
        permanent: true,
      },
    ];

    if (process.env.ENABLE_NEW_DOMAIN_REDIRECT === "true") {
      redirects.push({
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "new.usamissionaries.org",
          },
        ],
        destination: "https://usamissionaries.org/:path*",
        permanent: true,
      });
    }

    return redirects;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: path.join(__dirname),
  },
};
module.exports = nextConfig;
