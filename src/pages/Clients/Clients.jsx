import { useCallback, useEffect, useState } from 'react';
import { LuPlus, LuSearch, LuPencil, LuTrash2, LuPhone, LuMessageCircle, LuMail } from 'react-icons/lu';
import { fetchClients, deleteClient } from '../../services/clientService';
import { useLanguage } from '../../contexts/LanguageContext';
import ClientFormModal from './ClientFormModal';
import './Clients.css';

export default function Clients() {
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchClients(search);
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadClients, 300);
    return () => clearTimeout(timeout);
  }, [loadClients]);

  function openCreateForm() {
    setEditingClient(null);
    setFormOpen(true);
  }

  function openEditForm(client) {
    setEditingClient(client);
    setFormOpen(true);
  }

  async function handleDelete(client) {
    if (!window.confirm(t('clients.confirmDelete', { name: client.nom }))) return;
    try {
      await deleteClient(client.id);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setFormOpen(false);
    loadClients();
  }

  return (
    <div className="clients">
      <div className="page-header">
        <div>
          <h1>{t('clients.title')}</h1>
          <p>{t('clients.subtitle')}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreateForm}>
          <LuPlus /> {t('clients.newClient')}
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <LuSearch />
          <input
            type="text"
            placeholder={t('clients.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : clients.length === 0 ? (
        <div className="page-empty">
          <p>{t('clients.noClientsYet')}</p>
          <button className="btn btn--primary" onClick={openCreateForm}>
            <LuPlus /> {t('clients.addFirstClient')}
          </button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('clients.columnClient')}</th>
                <th>{t('clients.columnContact')}</th>
                <th>{t('clients.columnCreditLimit')}</th>
                <th>{t('clients.columnDebt')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div className="data-table__title">{client.nom}</div>
                    {client.adresse && <div className="data-table__subtitle">{client.adresse}</div>}
                  </td>
                  <td>
                    <div className="contact-links">
                      {client.telephone && (
                        <a href={`tel:${client.telephone}`} className="contact-links__item">
                          <LuPhone /> {client.telephone}
                        </a>
                      )}
                      {client.whatsapp && (
                        <a
                          href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-links__item"
                        >
                          <LuMessageCircle /> WhatsApp
                        </a>
                      )}
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="contact-links__item">
                          <LuMail /> {client.email}
                        </a>
                      )}
                      {!client.telephone && !client.whatsapp && !client.email && '—'}
                    </div>
                  </td>
                  <td>{Number(client.limite_credit).toLocaleString('fr-FR')} FCFA</td>
                  <td>
                    {client.solde_dette > 0 ? (
                      <span className="badge badge--danger">
                        {Number(client.solde_dette).toLocaleString('fr-FR')} FCFA
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="data-table__actions">
                    <button className="icon-btn" onClick={() => openEditForm(client)} aria-label={t('clients.edit')}>
                      <LuPencil />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => handleDelete(client)}
                      aria-label={t('clients.delete')}
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
        <ClientFormModal client={editingClient} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
