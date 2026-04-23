"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for ThreeHero.
 * landing-page.tsx is a server component; dynamic({ ssr: false }) is only
 * allowed in client components. This tiny wrapper bridges the gap without
 * forcing the whole landing page to opt out of SSR.
 */
const ThreeHero = dynamic(() => import("./three-hero"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-zinc-950" />,
});

export default ThreeHero;
