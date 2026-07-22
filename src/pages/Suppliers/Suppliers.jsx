import { useCallback, useEffect, useState } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash2, LuPhone, LuMessageCircle, LuMail } from 'react-icons/lu';
import { fetchSuppliers, deleteSupplier } from '../../services/supplierService';
import { useLanguage } from '../../contexts/LanguageContext';
import SupplierFormModal from './SupplierFormModal';
import './Suppliers.css';

export default function Suppliers() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSuppliers(search);
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadSuppliers, 300);
    return () => clearTimeout(timeout);
  }, [loadSuppliers]);

  function openCreateForm() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function openEditForm(supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  async function handleDelete(supplier) {
    if (!window.confirm(t('suppliers.confirmDelete', { name: supplier.nom }))) return;
    try {
      await deleteSupplier(supplier.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setFormOpen(false);
    loadSuppliers();
  }

  return (
    <div className="suppliers">
      <div className="page-header">
        <div>
          <h1>{t('suppliers.title')}</h1>
          <p>{t('suppliers.subtitle')}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreateForm}>
          <LuPlus /> {t('suppliers.newSupplier')}
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <LuSearch />
          <input
            type="text"
            placeholder={t('suppliers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : suppliers.length === 0 ? (
        <div className="page-empty">
          <p>{t('suppliers.noSuppliersYet')}</p>
          <button className="btn btn--primary" onClick={openCreateForm}>
            <LuPlus /> {t('suppliers.addFirstSupplier')}
          </button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('suppliers.columnSupplier')}</th>
                <th>{t('suppliers.columnContact')}</th>
                <th>{t('suppliers.columnDebt')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div className="data-table__title">{supplier.nom}</div>
                    {supplier.contact_nom && (
                      <div className="data-table__subtitle">
                        {t('suppliers.contactPrefix')} {supplier.contact_nom}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="contact-links">
                      {supplier.telephone && (
                        <a href={`tel:${supplier.telephone}`} className="contact-links__item">
                          <LuPhone /> {supplier.telephone}
                        </a>
                      )}
                      {supplier.whatsapp && (
                        <a
                          href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-links__item"
                        >
                          <LuMessageCircle /> WhatsApp
                        </a>
                      )}
                      {supplier.email && (
                        <a href={`mailto:${supplier.email}`} className="contact-links__item">
                          <LuMail /> {supplier.email}
                        </a>
                      )}
                      {!supplier.telephone && !supplier.whatsapp && !supplier.email && '—'}
                    </div>
                  </td>
                  <td>
                    {supplier.solde_dette > 0 ? (
                      <span className="badge badge--danger">
                        {Number(supplier.solde_dette).toLocaleString('fr-FR')} FCFA
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="data-table__actions">
                    <button className="icon-btn" onClick={() => openEditForm(supplier)} aria-label={t('suppliers.edit')}>
                      <LuPencil />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => handleDelete(supplier)}
                      aria-label={t('suppliers.delete')}
                    >
                      <LuTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
