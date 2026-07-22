import { useState } from 'react';
import { LuX, LuPlus, LuTrash2 } from 'react-icons/lu';
import { createCategory, deleteCategory } from '../../services/categoryService';
import { useLanguage } from '../../contexts/LanguageContext';
import './CategoryModal.css';

export default function CategoryModal({ categories, onClose, onChanged }) {
  const { t } = useLanguage();
  const [nom, setNom] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const topLevel = categories.filter((c) => !c.parent_id);

  async function handleAdd(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    setError('');
    setSaving(true);
    try {
      await createCategory({ nom: nom.trim(), parentId: parentId || null });
      setNom('');
      setParentId('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    const hasChildren = categories.some((c) => c.parent_id === category.id);
    if (hasChildren) {
      setError(t('products.errorDeleteHasChildren'));
      return;
    }
    if (!window.confirm(t('products.confirmDeleteCategory', { name: category.nom }))) return;
    setError('');
    try {
      await deleteCategory(category.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('products.categoriesTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="page-error">{error}</div>}

          <form className="category-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder={t('products.categoryNamePlaceholder')}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{t('products.mainCategory')}</option>
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {t('products.subCategoryOf', { name: c.nom })}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              <LuPlus /> {t('common.add')}
            </button>
          </form>

          {topLevel.length === 0 ? (
            <p className="category-list__empty">{t('products.noCategoriesYet')}</p>
          ) : (
            <ul className="category-list">
              {topLevel.map((cat) => (
                <li key={cat.id}>
                  <div className="category-list__row">
                    <span>{cat.nom}</span>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => handleDelete(cat)}
                      aria-label={`${t('products.delete')} ${cat.nom}`}
                    >
                      <LuTrash2 />
                    </button>
                  </div>
                  <ul className="category-list__children">
                    {categories
                      .filter((c) => c.parent_id === cat.id)
                      .map((sub) => (
                        <li key={sub.id}>
                          <div className="category-list__row">
                            <span>— {sub.nom}</span>
                            <button
                              className="icon-btn icon-btn--danger"
                              onClick={() => handleDelete(sub)}
                              aria-label={`${t('products.delete')} ${sub.nom}`}
                            >
                              <LuTrash2 />
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
