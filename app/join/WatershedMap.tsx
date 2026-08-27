"use client";

import { useEffect, useRef } from "react";

import { startWatershed } from "./watershed-engine";

/**
 * USA-191: many streams, one river.
 *
 * The United States drawn as a field of gold dots, with the real Mississippi
 * watershed running through it: the main stem from Lake Itasca down to the
 * Gulf, and the Missouri, Ohio, Arkansas, Red, Tennessee, Platte and the rest
 * feeding into it exactly where they do on the ground.
 *
 * Light travels rather than blinks. Every drop enters at a headwater, runs its
 * own tributary, joins the river that tributary empties into, and keeps going
 * until it leaves past New Orleans. That is the whole idea of the image: the
 * work is many separate streams, and it all gathers into one thing moving
 * south.
 *
 * All of that lives in watershed-engine.ts, which knows nothing about React.
 * This component only owns the element and the lifetime.
 */
export function WatershedMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    return startWatershed(canvas);
  }, []);

  return <canvas aria-hidden="true" className="join-map" ref={canvasRef} />;
}
