import "server-only";

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function hasOperationsTestMarker(value: unknown) {
  const text = normalized(value);

  if (!text) {
    return false;
  }

  return text.includes("usa174")
    || text.includes("smoke-test")
    || text.includes("smoke test")
    || text.includes("+smoke")
    || text.includes("+test")
    || text.endsWith("@example.com")
    || text.endsWith(".test");
}

export function payloadHasOperationsTestMarker(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const serialized = JSON.stringify(payload).toLowerCase();

  return serialized.includes('"operationstestrecord":true')
    || serialized.includes('"operations_test_record":true')
    || serialized.includes('"testrecord":true')
    || serialized.includes('"test_record":true')
    || serialized.includes("usa174")
    || serialized.includes("smoke-test")
    || serialized.includes("smoke test");
}
