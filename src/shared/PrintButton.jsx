import { useState } from 'react';
import { LuPrinter, LuLoaderCircle } from 'react-icons/lu';
import './PrintButton.css';

const FORMATS = [
  { id: 'a4', label: 'PDF A4' },
  { id: 'thermal80', label: 'Thermique 80mm' },
  { id: 'thermal58', label: 'Thermique 58mm' },
];

export default function PrintButton({ onPrint }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleSelect(format) {
    setOpen(false);
    setGenerating(true);
    try {
      await onPrint(format);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="print-button">
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => setOpen((v) => !v)}
        disabled={generating}
      >
        {generating ? <LuLoaderCircle className="spin" /> : <LuPrinter />}
        {generating ? 'Génération...' : 'Imprimer / PDF'}
      </button>
      {open && (
        <>
          <div className="print-button__overlay" onClick={() => setOpen(false)} />
          <div className="print-button__menu">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" onClick={() => handleSelect(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
