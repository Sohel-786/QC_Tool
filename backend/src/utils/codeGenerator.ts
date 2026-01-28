/**
 * Generates the next auto-incremented code based on a prefix and current count
 * Format: PREFIX-001, PREFIX-002, etc.
 */
export function generateNextCode(prefix: string, currentCount: number): string {
  const nextNumber = currentCount + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}-${paddedNumber}`;
}
