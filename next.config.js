const path = require("path");

const apexRedirectHosts = [
  ["www.usamissionaries.org", "usamissionaries.org"],
  ["www.kitchentablegospel.org", "kitchentablegospel.org"],
  ["www.discipleshipoperatingsystem.com", "discipleshipoperatingsystem.com"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const redirects = apexRedirectHosts.map(([sourceHost, destinationHost]) => ({
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

    redirects.push({
      source: "/ecosystem",
      destination: "/system",
      permanent: true,
    });

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
