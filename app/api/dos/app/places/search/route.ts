import { NextResponse } from "next/server";
import { getDosAuthorization } from "@/src/lib/dos/auth";

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  id?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  name?: string;
};

function placesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
}

function coordinateFromParam(value: string | null) {
  if (!value) {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

export async function GET(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = placesApiKey();

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      places: [],
    });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.trim() ?? "";
  const latitude = coordinateFromParam(requestUrl.searchParams.get("lat"));
  const longitude = coordinateFromParam(requestUrl.searchParams.get("lng"));

  if (query.length < 2) {
    return NextResponse.json({
      configured: true,
      places: [],
    });
  }

  const body: Record<string, unknown> = {
    maxResultCount: 6,
    textQuery: query,
  };

  if (latitude !== null && longitude !== null) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: 8000,
      },
    };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.name,places.displayName,places.formattedAddress,places.location",
    },
    method: "POST",
  });
  const result = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    places?: GooglePlace[];
  };

  if (!response.ok) {
    return NextResponse.json({
      configured: true,
      error: result.error?.message ?? "Place search unavailable.",
      places: [],
    }, { status: response.status });
  }

  return NextResponse.json({
    configured: true,
    places: (result.places ?? []).map((place, index) => ({
      address: place.formattedAddress ?? null,
      id: place.id ?? place.name ?? place.formattedAddress ?? place.displayName?.text ?? `place-${index}`,
      label: place.displayName?.text ?? place.formattedAddress ?? "Location",
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
    })),
  });
}
