export function formatMaskedCardNumber(value?: string): string {
  const raw = value || '•••• •••• •••• 8821';
  return raw
    .replace(/ÔÇó/g, '•')
    .replace(/â€¢/g, '•')
    .replace(/\s+/g, ' ')
    .trim();
}
