const path = require("path");

// [sourceHost, destinationHost]. Most brands collapse www onto the apex;
// Mission of Reconciliation runs on www, so it points the other way.
const hostRedirects = [
  ["www.usamissionaries.org", "usamissionaries.org"],
  ["www.kitchentablegospel.org", "kitchentablegospel.org"],
  ["www.discipleshipoperatingsystem.com", "discipleshipoperatingsystem.com"],
  ["missionofreconciliation.org", "www.missionofreconciliation.org"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const redirects = hostRedirects.map(([sourceHost, destinationHost]) => ({
      source: "/:path*",
      has: [
        {
          type: "host",
          // Anchored: `has.value` is a regex, and an unanchored apex would also
          // match its own www host, which self-redirects.
          value: `^${sourceHost.replace(/\./g, "\\.")}$`,
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
