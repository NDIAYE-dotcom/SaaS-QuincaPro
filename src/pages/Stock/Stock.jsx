import { useCallback, useEffect, useState } from 'react';
import { LuTriangleAlert, LuArrowDownToLine, LuArrowUpFromLine, LuClipboardList } from 'react-icons/lu';
import { fetchProducts } from '../../services/productService';
import { fetchStockMovements } from '../../services/stockService';
import { getStockStatus } from '../../utils/stock';
import { useLanguage } from '../../contexts/LanguageContext';
import StockMovementModal from './StockMovementModal';
import './Stock.css';

const TYPE_BADGE = {
  entree: 'badge--success',
  sortie: 'badge--danger',
  correction: 'badge--warning',
  inventaire: 'badge--warning',
};

export default function Stock() {
  const { t } = useLanguage();
  const TYPE_LABELS = {
    entree: t('stock.typeIn'),
    sortie: t('stock.typeOut'),
    correction: t('stock.typeCorrection'),
    inventaire: t('stock.typeInventory'),
  };
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState('entree');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsData, movementsData] = await Promise.all([
        fetchProducts(),
        fetchStockMovements({ limit: 100 }),
      ]);
      setProducts(productsData);
      setMovements(movementsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const alerts = products.filter((p) => p.quantite_stock <= p.stock_minimum);

  function openMovement(type) {
    setMovementType(type);
    setMovementOpen(true);
  }

  function handleSaved() {
    setMovementOpen(false);
    loadData();
  }

  return (
    <div className="stock">
      <div className="page-header">
        <div>
          <h1>{t('stock.title')}</h1>
          <p>{t('stock.subtitle')}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => openMovement('sortie')}>
            <LuArrowUpFromLine /> {t('stock.out')}
          </button>
          <button className="btn btn--ghost" onClick={() => openMovement('inventaire')}>
            <LuClipboardList /> {t('stock.inventory')}
          </button>
          <button className="btn btn--primary" onClick={() => openMovement('entree')}>
            <LuArrowDownToLine /> {t('stock.in')}
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {alerts.length > 0 && (
        <div className="stock__alerts">
          <div className="stock__alerts-header">
            <LuTriangleAlert /> {alerts.length} {t('stock.alertsHeader')}
          </div>
          <div className="stock__alerts-list">
            {alerts.map((p) => {
              const status = getStockStatus(p, t);
              return (
                <div key={p.id} className="stock__alert-item">
                  <span>{p.nom}</span>
                  <span className={`badge ${status.className}`}>
                    {p.quantite_stock} {p.unite} · {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="section-title">{t('stock.movementsJournal')}</h2>

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : movements.length === 0 ? (
        <div className="page-empty">
          <p>{t('stock.noMovementsYet')}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('stock.columnDate')}</th>
                <th>{t('stock.columnProduct')}</th>
                <th>{t('stock.columnType')}</th>
                <th>{t('stock.columnQty')}</th>
                <th>{t('stock.columnBeforeAfter')}</th>
                <th>{t('stock.columnReason')}</th>
                <th>{t('stock.columnBy')}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('fr-FR')}</td>
                  <td className="data-table__title">{m.produit?.nom || '—'}</td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[m.type]}`}>{TYPE_LABELS[m.type]}</span>
                  </td>
                  <td>
                    {m.quantite > 0 ? '+' : ''}
                    {m.quantite} {m.produit?.unite}
                  </td>
                  <td>
                    {m.quantite_avant} → {m.quantite_apres}
                  </td>
                  <td>{m.motif || '—'}</td>
                  <td>{m.auteur?.nom_complet || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {movementOpen && (
        <StockMovementModal
          type={movementType}
          products={products}
          onClose={() => setMovementOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
