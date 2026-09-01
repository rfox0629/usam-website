"use client";

import { useEffect, useRef } from "react";

import { startMovementField } from "./movement-field-engine";

/**
 * The /join hero graphic: the United States coming alive under the cursor,
 * over a simple river system gathering toward the Mississippi.
 *
 * Everything lives in movement-field-engine.ts, which knows nothing about
 * React. This component owns only the element and its lifetime.
 */
export function MovementField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    return startMovementField(canvas);
  }, []);

  return <canvas aria-hidden="true" className="join-map" ref={canvasRef} />;
}
