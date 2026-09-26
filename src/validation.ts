/** Shared input checks. Failure is explicit; invalid values never become zero. */
export function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
  return value;
}

export function nonnegative(value: number, name: string): number {
  if (finite(value, name) < 0) throw new Error(`${name} must be nonnegative`);
  return value;
}

export function whole(value: number, name: string): number {
  nonnegative(value, name);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a whole safe integer`);
  return value;
}

export function identifier(value: string, name: string): string {
  if (!value.trim()) throw new Error(`${name} must be nonempty`);
  return value;
}

export function instant(value: string): number {
  // Explicit offset prevents the process timezone from changing an analysis.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`Expected an ISO timestamp with timezone: ${value}`);
  }
  return finite(Date.parse(value), "timestamp");
}

export function distribution(probabilities: readonly number[]): void {
  if (probabilities.length === 0) throw new Error("Distribution must be nonempty");
  for (const probability of probabilities) {
    if (nonnegative(probability, "probability") > 1) throw new Error("Probability exceeds one");
  }
  const total = probabilities.reduce((sum, probability) => sum + probability, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Probabilities must sum to one; got ${total}`);
}

export function unique(values: readonly string[], name: string): void {
  values.forEach(value => identifier(value, name));
  if (new Set(values).size !== values.length) throw new Error(`${name} must be unique`);
}
