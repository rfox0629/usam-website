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
  /**
   * Link previews are cached by every platform that has ever scraped a URL, and
   * those caches still point at the retired photo cards. Rather than leave the
   * old artwork on disk — or 404 an already-shared link — the old paths now
   * serve the current card, so an old unfurl upgrades itself on re-scrape.
   */
  async rewrites() {
    return [
      { destination: "/share/usam", source: "/images/share/usam.jpg" },
      { destination: "/share/usam", source: "/images/usam/groups-share.png" },
      { destination: "/share/kitchen-table-gospel", source: "/images/share/kitchen-table-gospel.jpg" },
      { destination: "/share/discipleship-operating-system", source: "/images/share/dos.png" },
      {
        destination: "/share/mission-of-reconciliation",
        source: "/images/share/mission-of-reconciliation.png",
      },
    ];
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
