import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Public-site link. Automatic viewport prefetching is disabled because the unprefixed-English
 * locale rewrite (proxy.ts) caused repeated prefetch requests in production builds.
 * Navigation remains client-side; pages are server-rendered quickly with cached data.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
