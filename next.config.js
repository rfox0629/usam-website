const path = require("path");

const canonicalRedirectHosts = [
  ["www.usamissionaries.org", "usamissionaries.org"],
  ["usamissionaries.com", "usamissionaries.org"],
  ["www.usamissionaries.com", "usamissionaries.org"],
  ["kitchentablegospel.org", "www.kitchentablegospel.org"],
  ["ktgospel.com", "www.kitchentablegospel.org"],
  ["www.ktgospel.com", "www.kitchentablegospel.org"],
  ["discipleshipoperatingsystem.com", "www.discipleshipoperatingsystem.com"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const redirects = canonicalRedirectHosts.map(([sourceHost, destinationHost]) => ({
      source: "/:path*",
      has: [
        {
          type: "host",
          value: sourceHost,
        },
      ],
      destination: `https://${destinationHost}/:path*`,
      permanent: true,
    }));

    if (process.env.ENABLE_NEW_DOMAIN_REDIRECT === "true") {
      // Backward compatibility only: send old cutover-host traffic to the canonical production host.
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
