export function directionsUrl(address: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const parts = [address.street, address.city, address.state, address.zip].filter(
    Boolean,
  );
  if (parts.length === 0) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    parts.join(", "),
  )}`;
}
