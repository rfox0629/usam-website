"use client";

import { useEffect } from "react";

type MissionaryProfileViewTrackerProps = {
  missionaryProfileId: string;
  profileSlug: string;
};

const sessionStorageKey = "usam_profile_session_id";
const visitorStorageKey = "usam_profile_visitor_id";

function createTrackingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getStoredTrackingId(storage: Storage, key: string) {
  try {
    const currentValue = storage.getItem(key);

    if (currentValue) {
      return currentValue;
    }

    const nextValue = createTrackingId();
    storage.setItem(key, nextValue);

    return nextValue;
  } catch {
    return createTrackingId();
  }
}

export function MissionaryProfileViewTracker({
  missionaryProfileId,
  profileSlug,
}: MissionaryProfileViewTrackerProps) {
  useEffect(() => {
    if (!missionaryProfileId || !profileSlug) {
      return;
    }

    const payload = JSON.stringify({
      missionaryProfileId,
      pagePath: window.location.pathname,
      profileSlug,
      referrer: document.referrer || null,
      sessionId: getStoredTrackingId(window.sessionStorage, sessionStorageKey),
      visitorId: getStoredTrackingId(window.localStorage, visitorStorageKey),
    });
    const endpoint = "/api/missionary-profile-views";
    const beaconPayload = new Blob([payload], { type: "application/json" });

    if (navigator.sendBeacon?.(endpoint, beaconPayload)) {
      return;
    }

    void fetch(endpoint, {
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  }, [missionaryProfileId, profileSlug]);

  return null;
}
