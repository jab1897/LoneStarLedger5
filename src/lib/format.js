export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const num = new Intl.NumberFormat('en-US');
export const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });
export const dt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-US');
};
