export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isStrongPassword(value: string) {
  if (value.length < 8 || value.length > 128) {
    return false;
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  return hasLower && hasUpper && hasDigit;
}

export function sanitizeText(value: unknown, maxLength = 120) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export type SanitizedAddress = {
  id: string;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
};

export function sanitizeAddresses(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SanitizedAddress[];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const id = sanitizeText(record.id, 48) || `ADR-${index + 1}`;
      const label = sanitizeText(record.label, 48) || 'Address';
      const street = sanitizeText(record.street, 140);
      const city = sanitizeText(record.city, 80);
      const zipCode = sanitizeText(record.zipCode, 24);
      const country = sanitizeText(record.country, 64) || 'Bulgaria';

      if (!street || !city || !zipCode) {
        return null;
      }

      return {
        id,
        label,
        street,
        city,
        zipCode,
        country,
      };
    })
    .filter((entry): entry is SanitizedAddress => Boolean(entry))
    .slice(0, 20);
}
