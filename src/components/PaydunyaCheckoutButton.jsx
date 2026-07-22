import { useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { createPaydunyaInvoice } from '../services/paydunyaService';
import { useLanguage } from '../contexts/LanguageContext';
import './PaydunyaCheckoutButton.css';

const PRIX_MENSUEL_FCFA = 5500;
const DUREES = [1, 3, 6, 12];

export default function PaydunyaCheckoutButton() {
  const { t } = useLanguage();
  const [dureeMois, setDureeMois] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    setError('');
    setLoading(true);
    try {
      const url = await createPaydunyaInvoice(dureeMois);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="paydunya-checkout">
      {error && <div className="page-error">{error}</div>}

      <label className="field paydunya-checkout__field">
        <span>{t('settings.duration')}</span>
        <select value={dureeMois} onChange={(e) => setDureeMois(Number(e.target.value))} disabled={loading}>
          {DUREES.map((d) => (
            <option key={d} value={d}>
              {d} {t('settings.months')} — {(PRIX_MENSUEL_FCFA * d).toLocaleString('fr-FR')} FCFA
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn btn--primary" onClick={handlePay} disabled={loading}>
        {loading && <LuLoaderCircle className="spin" />}
        {loading ? t('settings.redirecting') : t('settings.payWithPaydunya')}
      </button>
    </div>
  );
}
