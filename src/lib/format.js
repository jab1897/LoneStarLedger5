export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const num = new Intl.NumberFormat('en-US');
export const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });
export const dt = (iso) => { try { return new Date(iso).toLocaleDateString('en-US'); } catch { return String(iso ?? ''); } };
