import { useState } from 'react';
import { LuX, LuDownload, LuUpload, LuLoaderCircle, LuCircleCheck, LuCircleX } from 'react-icons/lu';
import {
  downloadProductImportTemplate,
  parseProductImportFile,
  validateImportRow,
  importProducts,
} from '../../services/productImportService';
import { useLanguage } from '../../contexts/LanguageContext';
import './ProductImportModal.css';

export default function ProductImportModal({ onClose, onImported }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('upload');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const records = await parseProductImportFile(file);
      if (records.length === 0) {
        setError(t('products.errorNoRows'));
        return;
      }
      setRows(records.map((record) => ({ ...validateImportRow(record) })));
      setStep('preview');
    } catch {
      setError(t('products.errorReadFile'));
    } finally {
      e.target.value = '';
    }
  }

  const validRows = rows.filter((r) => r.errors.length === 0);

  async function handleImport() {
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    try {
      const outcome = await importProducts(
        validRows.map((r) => r.data),
        { onProgress: (done, total) => setProgress({ done, total }) },
      );
      setResults(outcome);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function handleFinish() {
    onImported();
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return (
    <div className="modal-overlay" onClick={importing ? undefined : onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('products.importTitle')}</h2>
          {!importing && (
            <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
              <LuX />
            </button>
          )}
        </div>

        <div className="modal__body stacked-form">
          {error && <div className="page-error">{error}</div>}

          {step === 'upload' && (
            <>
              <p className="field__hint">{t('products.importIntro')}</p>
              <button type="button" className="btn btn--ghost" onClick={downloadProductImportTemplate}>
                <LuDownload /> {t('products.downloadTemplate')}
              </button>
              <label className="product-import__drop" htmlFor="import-file-input">
                <LuUpload />
                <span>{t('products.chooseFile')}</span>
              </label>
              <input
                id="import-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                hidden
              />
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="field__hint">
                {validRows.length} {t('products.previewReady')} {rows.length} {t('products.previewLinesRead')}
                {rows.length - validRows.length > 0 &&
                  ` ${rows.length - validRows.length} ${t('products.previewSkipped')}`}
              </p>
              <div className="data-table-wrap product-import__preview">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('products.fieldName')}</th>
                      <th>{t('products.fieldCategory')}</th>
                      <th>{t('products.fieldSellPrice')}</th>
                      <th>{t('products.columnInitialStock')}</th>
                      <th>{t('products.columnStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, index) => (
                      <tr key={index}>
                        <td>{r.data.nom || '—'}</td>
                        <td>{r.data.categorie || '—'}</td>
                        <td>{r.data.prix_vente}</td>
                        <td>{r.data.stock_initial}</td>
                        <td>
                          {r.errors.length === 0 ? (
                            <span className="badge badge--success">{t('products.valid')}</span>
                          ) : (
                            <span className="badge badge--danger" title={r.errors.join(', ')}>
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <p>
                <strong>{successCount}</strong> {t('products.importedSuccessfully')}
                {failureCount > 0 && ` ${failureCount} ${t('products.failures')}`}
              </p>
              {failureCount > 0 && (
                <div className="data-table-wrap product-import__preview">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('products.fieldName')}</th>
                        <th>{t('products.columnError')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results
                        .filter((r) => !r.success)
                        .map((r, index) => (
                          <tr key={index}>
                            <td>{r.row.nom}</td>
                            <td>{r.error}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal__footer">
          {step === 'preview' && (
            <>
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={importing}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
              >
                {importing && <LuLoaderCircle className="spin" />}
                {importing
                  ? `${t('products.importing')} (${progress.done}/${progress.total})`
                  : `${t('products.importButton')} ${validRows.length} ${
                      validRows.length > 1 ? t('products.products') : t('products.product')
                    }`}
              </button>
            </>
          )}

          {step === 'upload' && (
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('common.close')}
            </button>
          )}

          {step === 'done' && (
            <button type="button" className="btn btn--primary" onClick={handleFinish}>
              {successCount > 0 ? <LuCircleCheck /> : <LuCircleX />} {t('products.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
