import { useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { createPaydunyaInvoice } from '../services/paydunyaService';
import './PaydunyaCheckoutButton.css';

const PRIX_MENSUEL_FCFA = 5000;
const DUREES = [1, 3, 6, 12];

export default function PaydunyaCheckoutButton() {
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
        <span>Durée</span>
        <select value={dureeMois} onChange={(e) => setDureeMois(Number(e.target.value))} disabled={loading}>
          {DUREES.map((d) => (
            <option key={d} value={d}>
              {d} mois — {(PRIX_MENSUEL_FCFA * d).toLocaleString('fr-FR')} FCFA
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn btn--primary" onClick={handlePay} disabled={loading}>
        {loading && <LuLoaderCircle className="spin" />}
        {loading ? 'Redirection...' : 'Payer avec PayDunya'}
      </button>
    </div>
  );
}
