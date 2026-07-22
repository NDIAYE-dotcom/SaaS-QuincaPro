import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuFileDown, LuFileSpreadsheet, LuFileText } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportToCsv, exportToExcel } from '../../utils/exportUtils';
import { getReportTypes } from './reportTypes';
import './Reports.css';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reports() {
  const { entreprise } = useAuth();
  const { t } = useLanguage();
  const REPORT_TYPES = useMemo(() => getReportTypes(t), [t]);
  const DATE_PRESETS = useMemo(
    () => [
      { label: t('reports.presetMonth'), from: startOfMonth },
      { label: t('reports.preset3Months'), from: () => monthsAgo(3) },
      { label: t('reports.preset6Months'), from: () => monthsAgo(6) },
      { label: t('reports.presetYear'), from: startOfYear },
    ],
    [t],
  );
  const [typeId, setTypeId] = useState(REPORT_TYPES[0].id);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const reportType = useMemo(() => REPORT_TYPES.find((rt) => rt.id === typeId) || REPORT_TYPES[0], [
    REPORT_TYPES,
    typeId,
  ]);

  function applyPreset(preset) {
    setDateFrom(preset.from());
    setDateTo(today());
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reportType.fetch({ from: dateFrom, to: dateTo });
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => reportType.summary(rows), [reportType, rows]);

  const rangeLabel = reportType.needsDateRange
    ? t('reports.rangeLabel', {
        from: new Date(dateFrom).toLocaleDateString('fr-FR'),
        to: new Date(dateTo).toLocaleDateString('fr-FR'),
      })
    : t('reports.currentSituation');

  async function handleExportCsv() {
    exportToCsv(`${reportType.id}.csv`, reportType.columns, rows);
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      await exportToExcel(`${reportType.id}.xlsx`, reportType.columns, rows, reportType.label);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      const { generateReportPdf } = await import('../../services/pdfService');
      await generateReportPdf({
        title: `${t('reports.title')} — ${reportType.label}`,
        subtitle: rangeLabel,
        entreprise,
        columns: reportType.columns,
        rows,
        filename: `${reportType.id}.pdf`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="reports">
      <div className="page-header">
        <div>
          <h1>{t('reports.title')}</h1>
          <p>{t('reports.subtitle')}</p>
        </div>
      </div>

      <div className="reports__toolbar">
        <label className="field">
          <span>{t('reports.reportType')}</span>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {REPORT_TYPES.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.label}
              </option>
            ))}
          </select>
        </label>

        {reportType.needsDateRange && (
          <>
            <div className="reports__presets">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="reports__preset-btn"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span>{t('reports.from')}</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo} />
            </label>
            <label className="field">
              <span>{t('reports.to')}</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} />
            </label>
          </>
        )}

        <div className="reports__export-buttons">
          <button className="btn btn--ghost" onClick={handleExportPdf} disabled={exporting || rows.length === 0}>
            <LuFileText /> PDF
          </button>
          <button className="btn btn--ghost" onClick={handleExportExcel} disabled={exporting || rows.length === 0}>
            <LuFileSpreadsheet /> Excel
          </button>
          <button className="btn btn--ghost" onClick={handleExportCsv} disabled={exporting || rows.length === 0}>
            <LuFileDown /> CSV
          </button>
        </div>
      </div>

      {reportType.note && <p className="reports__note">{reportType.note}</p>}
      {error && <div className="page-error">{error}</div>}

      {!loading && (
        <div className="reports__summary">
          {summary.map((s) => (
            <div key={s.label} className="reports__summary-card">
              <span className="reports__summary-label">{s.label}</span>
              <span className="reports__summary-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="page-loading">{t('common.loading')}</p>}

      {!loading && rows.length === 0 && <p className="page-empty">{t('reports.noDataForPeriod')}</p>}

      {!loading && rows.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {reportType.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {reportType.columns.map((c) => (
                    <td key={c.key}>{c.format ? c.format(row[c.key]) : row[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
