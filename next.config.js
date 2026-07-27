const path = require("path");
const ecosystemRoutes = require("./src/data/ecosystem-routes.json");

const apexRedirectHosts = [
  ["www.usamissionaries.org", "usamissionaries.org"],
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

    if (process.env.ENABLE_ECOSYSTEM_DOMAIN_REDIRECTS === "true") {
      ecosystemRoutes.externalDomainRedirects.forEach((redirectConfig) => {
        redirectConfig.sourceHosts.forEach((sourceHost) => {
          redirects.push({
            source: "/:path*",
            has: [
              {
                type: "host",
                value: sourceHost,
              },
            ],
            destination: redirectConfig.destination,
            permanent: true,
          });
        });
      });
    }

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
