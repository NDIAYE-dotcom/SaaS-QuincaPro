import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuTriangleAlert, LuX } from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import './AnnouncementBanner.css';

const WARNING_THRESHOLD_DAYS = 5;
const STORAGE_KEY = 'quincapro-dismissed-expiry-warning';

export default function SubscriptionExpiryBanner() {
  const { entreprise, profile, isSuperAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const daysLeft = useMemo(() => {
    if (!entreprise?.date_expiration_abonnement) return null;
    const diffMs = new Date(entreprise.date_expiration_abonnement).getTime() - Date.now();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }, [entreprise?.date_expiration_abonnement]);

  const dismissKey = entreprise ? `${STORAGE_KEY}-${entreprise.id}-${entreprise.date_expiration_abonnement}` : null;

  if (
    isSuperAdmin ||
    !entreprise ||
    entreprise.statut_abonnement !== 'actif' ||
    daysLeft === null ||
    daysLeft < 0 ||
    daysLeft > WARNING_THRESHOLD_DAYS ||
    dismissed ||
    (dismissKey && sessionStorage.getItem(dismissKey))
  ) {
    return null;
  }

  function dismiss() {
    if (dismissKey) sessionStorage.setItem(dismissKey, '1');
    setDismissed(true);
  }

  const label =
    daysLeft === 0
      ? "Votre abonnement expire aujourd'hui."
      : daysLeft === 1
        ? 'Votre abonnement expire demain.'
        : `Votre abonnement expire dans ${daysLeft} jours.`;

  return (
    <div className="announcement-banner-stack">
      <div className="announcement-banner">
        <LuTriangleAlert className="announcement-banner__icon" />
        <div className="announcement-banner__content">
          <strong>{label}</strong>
          <span>
            {isAdmin ? (
              <>
                Renouvelez dès maintenant depuis{' '}
                <Link to="/parametres">Paramètres</Link> pour éviter toute interruption d'accès.
              </>
            ) : (
              "Contactez l'administrateur de votre entreprise pour le renouveler."
            )}
          </span>
        </div>
        <button className="icon-btn" onClick={dismiss} aria-label="Fermer">
          <LuX />
        </button>
      </div>
    </div>
  );
}
