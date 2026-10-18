/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // The page where someone approves an AI app must never load inside
        // another site's frame, or that site could trick them into clicking
        // Allow.
        source: "/oauth/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
