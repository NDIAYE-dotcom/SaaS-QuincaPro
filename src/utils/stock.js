export function getStockStatus(produit, t) {
  if (produit.quantite_stock <= 0) return { label: t('common.stockOutOfStock'), className: 'badge--danger' };
  if (produit.quantite_stock <= produit.stock_critique) {
    return { label: t('common.stockCritical'), className: 'badge--danger' };
  }
  if (produit.quantite_stock <= produit.stock_minimum) {
    return { label: t('common.stockLow'), className: 'badge--warning' };
  }
  return { label: t('common.stockOk'), className: 'badge--success' };
}
