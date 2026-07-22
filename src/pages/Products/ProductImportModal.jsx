import { useState } from 'react';
import { LuX, LuDownload, LuUpload, LuLoaderCircle, LuCircleCheck, LuCircleX } from 'react-icons/lu';
import {
  downloadProductImportTemplate,
  parseProductImportFile,
  validateImportRow,
  importProducts,
} from '../../services/productImportService';
import './ProductImportModal.css';

export default function ProductImportModal({ onClose, onImported }) {
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
        setError("Aucune ligne exploitable trouvée dans ce fichier. Vérifiez qu'il suit le modèle.");
        return;
      }
      setRows(records.map((record) => ({ ...validateImportRow(record) })));
      setStep('preview');
    } catch {
      setError('Impossible de lire ce fichier. Utilisez le modèle Excel/CSV fourni.');
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
          <h2>Importer des produits</h2>
          {!importing && (
            <button className="icon-btn" onClick={onClose} aria-label="Fermer">
              <LuX />
            </button>
          )}
        </div>

        <div className="modal__body stacked-form">
          {error && <div className="page-error">{error}</div>}

          {step === 'upload' && (
            <>
              <p className="field__hint">
                Importez plusieurs produits d'un coup depuis un fichier Excel (.xlsx) ou CSV. Téléchargez le
                modèle, remplissez-le, puis importez-le ci-dessous.
              </p>
              <button type="button" className="btn btn--ghost" onClick={downloadProductImportTemplate}>
                <LuDownload /> Télécharger le modèle Excel
              </button>
              <label className="product-import__drop" htmlFor="import-file-input">
                <LuUpload />
                <span>Choisir un fichier .xlsx ou .csv</span>
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
                {validRows.length} produit{validRows.length > 1 ? 's' : ''} prêt{validRows.length > 1 ? 's' : ''}{' '}
                à importer sur {rows.length} ligne{rows.length > 1 ? 's' : ''} lue{rows.length > 1 ? 's' : ''}.
                {rows.length - validRows.length > 0 &&
                  ` ${rows.length - validRows.length} ligne(s) en erreur seront ignorées.`}
              </p>
              <div className="data-table-wrap product-import__preview">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Catégorie</th>
                      <th>Prix de vente</th>
                      <th>Stock initial</th>
                      <th>Statut</th>
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
                            <span className="badge badge--success">Valide</span>
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
                <strong>{successCount}</strong> produit{successCount > 1 ? 's' : ''} importé
                {successCount > 1 ? 's' : ''} avec succès.
                {failureCount > 0 && ` ${failureCount} échec(s).`}
              </p>
              {failureCount > 0 && (
                <div className="data-table-wrap product-import__preview">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Erreur</th>
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
                Annuler
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
              >
                {importing && <LuLoaderCircle className="spin" />}
                {importing
                  ? `Import en cours... (${progress.done}/${progress.total})`
                  : `Importer ${validRows.length} produit${validRows.length > 1 ? 's' : ''}`}
              </button>
            </>
          )}

          {step === 'upload' && (
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fermer
            </button>
          )}

          {step === 'done' && (
            <button type="button" className="btn btn--primary" onClick={handleFinish}>
              {successCount > 0 ? <LuCircleCheck /> : <LuCircleX />} Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
