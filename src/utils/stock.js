export function getStockStatus(produit) {
  if (produit.quantite_stock <= 0) return { label: 'Rupture', className: 'badge--danger' };
  if (produit.quantite_stock <= produit.stock_critique) return { label: 'Critique', className: 'badge--danger' };
  if (produit.quantite_stock <= produit.stock_minimum) return { label: 'Stock faible', className: 'badge--warning' };
  return { label: 'En stock', className: 'badge--success' };
}
