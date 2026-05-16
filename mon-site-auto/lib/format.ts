export function parseNumericValue(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;

  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  const value = Number.parseInt(digits, 10);
  return Number.isNaN(value) ? null : value;
}

export function getCarPriceValue(
  numericPrice?: string | number | null,
  price?: string | number | null
): number | null {
  return parseNumericValue(numericPrice) ?? parseNumericValue(price);
}

function withThousands(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function formatPrice(raw?: string | number | null): string {
  const value = parseNumericValue(raw);
  return value !== null ? `${withThousands(value)} €` : "";
}

export function formatCarPrice(
  numericPrice?: string | number | null,
  price?: string | number | null
): string {
  const value = getCarPriceValue(numericPrice, price);
  return value !== null ? `${withThousands(value)} €` : "";
}

export function formatMileage(raw?: string | number | null): string {
  const value = parseNumericValue(raw);
  return value !== null ? `${withThousands(value)} km` : "";
}

export function formatPower(raw?: string | number | null): string {
  const value = parseNumericValue(raw);
  return value !== null ? `${withThousands(value)} ch` : "";
}
