/**
 * FinSight AI - Enterprise Data Privacy & Masking Utilities
 * Protects borrower PII by masking phone numbers, device signatures, PANs, and addresses in UI views.
 * Explicitly marks dataset as SIMULATED NBFC DATA.
 */

export const SIMULATED_DATA_NOTICE = 'SIMULATED NBFC DATA - SYNTHETIC ENTERPRISE BENCHMARK';

/**
 * Masks phone numbers: e.g. "+91 98765 43210" -> "+91 98*** **210" or "9876543210" -> "98*** **210"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '•••• •••• ••';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 10) return '•••-•••-••••';
  const start = clean.slice(0, 2);
  const end = clean.slice(-3);
  return `+91 ${start}••• ••${end}`;
}

/**
 * Masks PAN / Tax IDs: e.g. "ABCDE1234F" -> "ABC••••34F"
 */
export function maskPAN(pan?: string | null): string {
  if (!pan) return '••••••••••';
  if (pan.length < 5) return '•••••';
  return `${pan.slice(0, 3)}••••${pan.slice(-2)}`;
}

/**
 * Masks Device Signatures: e.g. "DEV-99A1-B882" -> "DEV-•••-B882"
 */
export function maskDeviceId(deviceId?: string | null): string {
  if (!deviceId) return 'DEV-••••••••';
  if (deviceId.length <= 8) return deviceId;
  return `${deviceId.slice(0, 4)}-••••-${deviceId.slice(-4)}`;
}

/**
 * Masks Street Address / Geo Location: e.g. "Flat 402, Green Glen Layout, Bellandur, Bengaluru" -> "Bellandur, Bengaluru [Masked]"
 */
export function maskAddress(address?: string | null): string {
  if (!address) return 'Restricted Address (PII Masked)';
  const parts = address.split(',');
  if (parts.length > 1) {
    const city = parts[parts.length - 1].trim();
    return `••••••••, ${city} (RBI Privacy Masked)`;
  }
  return 'Registered Location (PII Masked)';
}

/**
 * Masks Bank Account Number: e.g. "91823901923" -> "•••• •••• 1923"
 */
export function maskBankAccount(account?: string | null): string {
  if (!account) return '•••• •••• ••••';
  const end = account.slice(-4);
  return `•••• •••• ${end}`;
}
