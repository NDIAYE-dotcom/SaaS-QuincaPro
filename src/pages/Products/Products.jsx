import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash2, LuTags, LuImageOff, LuEyeOff, LuEye, LuFileUp } from 'react-icons/lu';
import { fetchProducts, deleteProduct, updateProduct } from '../../services/productService';
import { fetchCategories } from '../../services/categoryService';
import { getStockStatus } from '../../utils/stock';
import { useLanguage } from '../../contexts/LanguageContext';
import ProductFormModal from './ProductFormModal';
import CategoryModal from './CategoryModal';
import ProductImportModal from './ProductImportModal';
import './Products.css';

export default function Products() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  async function loadCategories() {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProducts({ search, categorieId: categoryFilter || null });
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  const categoryLabel = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.nom]));
    return (id) => map.get(id) || '—';
  }, [categories]);

  function openCreateForm() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEditForm(produit) {
    setEditingProduct(produit);
    setFormOpen(true);
  }

  async function handleDelete(produit) {
    if (!window.confirm(t('products.confirmDelete', { name: produit.nom }))) return;
    try {
      await deleteProduct(produit.id);
      setProducts((prev) => prev.filter((p) => p.id !== produit.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setFormOpen(false);
    loadProducts();
  }

  function handleImported() {
    setImportModalOpen(false);
    loadCategories();
    loadProducts();
  }

  async function handleToggleActive(produit) {
    try {
      const updated = await updateProduct(produit.id, { actif: !produit.actif });
      setProducts((prev) => prev.map((p) => (p.id === produit.id ? updated : p)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="products">
      <div className="page-header">
        <div>
          <h1>{t('products.title')}</h1>
          <p>{t('products.subtitle')}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => setCategoryModalOpen(true)}>
            <LuTags /> {t('products.categories')}
          </button>
          <button className="btn btn--ghost" onClick={() => setImportModalOpen(true)}>
            <LuFileUp /> {t('products.import')}
          </button>
          <button className="btn btn--primary" onClick={openCreateForm}>
            <LuPlus /> {t('products.newProduct')}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <LuSearch />
          <input
            type="text"
            placeholder={t('products.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">{t('products.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? `— ${c.nom}` : c.nom}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : products.length === 0 ? (
        <div className="page-empty">
          <p>{t('products.noProductsYet')}</p>
          <button className="btn btn--primary" onClick={openCreateForm}>
            <LuPlus /> {t('products.addFirstProduct')}
          </button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>{t('products.columnProduct')}</th>
                <th>{t('products.columnCategory')}</th>
                <th>{t('products.columnSku')}</th>
                <th>{t('products.columnSellPrice')}</th>
                <th>{t('products.columnStock')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((produit) => {
                const status = getStockStatus(produit, t);
                return (
                  <tr key={produit.id}>
                    <td className="products__photo-cell">
                      {produit.photo_url ? (
                        <img src={produit.photo_url} alt={produit.nom} />
                      ) : (
                        <div className="products__photo-placeholder">
                          <LuImageOff />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="data-table__title">
                        {produit.nom}{' '}
                        {!produit.actif && <span className="badge badge--danger">{t('products.inactive')}</span>}
                      </div>
                      {produit.marque && <div className="data-table__subtitle">{produit.marque}</div>}
                    </td>
                    <td>{categoryLabel(produit.categorie_id)}</td>
                    <td>{produit.sku || '—'}</td>
                    <td>{Number(produit.prix_vente).toLocaleString('fr-FR')} FCFA</td>
                    <td>
                      <span className={`badge ${status.className}`}>
                        {produit.quantite_stock} {produit.unite} · {status.label}
                      </span>
                    </td>
                    <td className="data-table__actions">
                      <button className="icon-btn" onClick={() => openEditForm(produit)} aria-label={t('products.edit')}>
                        <LuPencil />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleToggleActive(produit)}
                        aria-label={produit.actif ? t('products.deactivate') : t('products.activate')}
                      >
                        {produit.actif ? <LuEyeOff /> : <LuEye />}
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={() => handleDelete(produit)}
                        aria-label={t('products.delete')}
                      >
                        <LuTrash2 />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {categoryModalOpen && (
        <CategoryModal
          categories={categories}
          onClose={() => setCategoryModalOpen(false)}
          onChanged={loadCategories}
        />
      )}

      {importModalOpen && (
        <ProductImportModal onClose={() => setImportModalOpen(false)} onImported={handleImported} />
      )}
    </div>
  );
}
