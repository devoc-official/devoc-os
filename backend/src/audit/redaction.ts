const SENSITIVE_KEY_PATTERN = /(password|passcode|token|jwt|secret|apiKey|api_key|creditCard|credit_card|cvv|ssn|authHeader|authorization)/i;
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB

export function redactPayload<T = Record<string, unknown>>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPayload(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redactPayload(value);
    } else {
      result[key] = value;
    }
  }

  // Payload truncation check
  try {
    const stringified = JSON.stringify(result);
    if (stringified.length > MAX_PAYLOAD_BYTES) {
      return {
        _truncated: true,
        _originalSize: stringified.length,
        summary: 'Payload truncated due to size limit exceeding 64KB',
      } as unknown as T;
    }
  } catch (_e) {
    // Return original result if serialization fails
  }

  return result as T;
}
