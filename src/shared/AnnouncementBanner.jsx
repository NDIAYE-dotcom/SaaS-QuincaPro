import { useEffect, useState } from 'react';
import { LuMegaphone, LuX } from 'react-icons/lu';
import { fetchActiveAnnouncements } from '../services/superAdminService';
import './AnnouncementBanner.css';

const STORAGE_KEY = 'quincapro-dismissed-annonces';

function getDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function AnnouncementBanner() {
  const [annonces, setAnnonces] = useState([]);

  useEffect(() => {
    fetchActiveAnnouncements()
      .then((data) => {
        const dismissed = getDismissed();
        setAnnonces(data.filter((a) => !dismissed.includes(a.id)));
      })
      .catch(() => {});
  }, []);

  function dismiss(id) {
    const dismissed = getDismissed();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, id]));
    setAnnonces((prev) => prev.filter((a) => a.id !== id));
  }

  if (annonces.length === 0) return null;

  return (
    <div className="announcement-banner-stack">
      {annonces.map((a) => (
        <div key={a.id} className="announcement-banner">
          <LuMegaphone className="announcement-banner__icon" />
          <div className="announcement-banner__content">
            <strong>{a.titre}</strong>
            <span>{a.message}</span>
          </div>
          <button className="icon-btn" onClick={() => dismiss(a.id)} aria-label="Fermer">
            <LuX />
          </button>
        </div>
      ))}
    </div>
  );
}
