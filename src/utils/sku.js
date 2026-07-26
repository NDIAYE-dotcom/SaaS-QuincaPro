export function generateSku(nom, seq) {
  const cleaned = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  const prefix = (cleaned.slice(0, 3) || 'PRD').padEnd(3, 'X');
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}
