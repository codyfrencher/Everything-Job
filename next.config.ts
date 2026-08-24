import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Job photos are capped at 10MB in job-photos.ts — this needs real
      // headroom above that, not an equal value, since the actual request
      // body is the file plus multipart/form-data overhead. Without the
      // gap, a photo right at the app's own limit gets rejected by this
      // hard ceiling before ever reaching that friendlier error message.
      bodySizeLimit: "15mb",
    },
    // proxy.ts (auth middleware) runs in front of every request and
    // buffers the body itself, separately from the Server Actions limit
    // above and with its own default 10MB cap. Over that cap it doesn't
    // error — it silently truncates the body, which then reaches the
    // upload handler as corrupted multipart data ("Unexpected end of
    // form") instead of the request just being too big. Needs to be at
    // least as high as serverActions.bodySizeLimit or a large-but-valid
    // photo gets mangled before ever reaching that check.
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;
