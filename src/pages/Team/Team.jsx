import { useCallback, useEffect, useState } from 'react';
import { LuPlus, LuCopy, LuTrash2, LuUserX, LuUserCheck, LuCheck } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchTeamMembers,
  setMemberRole,
  setMemberActive,
  removeMember,
  fetchInvitations,
  revokeInvitation,
} from '../../services/teamService';
import { ROLE_LABELS, INVITABLE_ROLES } from '../../constants/roles';
import InviteMemberModal from './InviteMemberModal';
import './Team.css';

export default function Team() {
  const { profile: currentProfile } = useAuth();
  const isAdmin = currentProfile?.role === 'admin' || currentProfile?.role === 'super_admin';

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersData, invitationsData] = await Promise.all([
        fetchTeamMembers(),
        fetchInvitations(),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData.filter((i) => !i.used_at));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRoleChange(member, role) {
    try {
      await setMemberRole(member.id, role);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(member) {
    try {
      await setMemberActive(member.id, !member.actif);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Retirer « ${member.nom_complet} » de l'équipe ?`)) return;
    try {
      await removeMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevoke(invitation) {
    if (!window.confirm(`Révoquer l'invitation envoyée à ${invitation.email} ?`)) return;
    try {
      await revokeInvitation(invitation.id);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function inviteLink(token) {
    return `${window.location.origin}/invitation/${token}`;
  }

  async function copyLink(token, id) {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt('Copiez ce lien :', inviteLink(token));
    }
  }

  if (!isAdmin) {
    return (
      <div className="team">
        <div className="page-header">
          <h1>Équipe</h1>
        </div>
        <div className="page-error">Seul un administrateur peut gérer l'équipe.</div>
      </div>
    );
  }

  return (
    <div className="team">
      <div className="page-header">
        <div>
          <h1>Équipe</h1>
          <p>Membres ayant accès à votre entreprise sur QuincaPro</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            <LuPlus /> Inviter un membre
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {newLink && (
        <div className="team__new-link">
          <span>Invitation créée. Partagez ce lien avec la personne concernée :</span>
          <div className="team__new-link-row">
            <code>{newLink}</code>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                navigator.clipboard?.writeText(newLink);
              }}
            >
              <LuCopy /> Copier
            </button>
          </div>
          <button type="button" className="team__new-link-close" onClick={() => setNewLink('')}>
            Fermer
          </button>
        </div>
      )}

      {loading && <p className="page-loading">Chargement...</p>}

      {!loading && (
        <>
          <h2 className="section-title">Membres ({members.length})</h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="data-table__title">
                      {m.nom_complet}
                      {m.id === currentProfile.id && <span className="data-table__subtitle"> (vous)</span>}
                    </td>
                    <td>{m.telephone || '—'}</td>
                    <td>
                      {m.role === 'super_admin' ? (
                        ROLE_LABELS[m.role]
                      ) : (
                        <select
                          value={m.role}
                          disabled={m.id === currentProfile.id}
                          onChange={(e) => handleRoleChange(m, e.target.value)}
                        >
                          {INVITABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${m.actif ? 'badge--success' : 'badge--danger'}`}>
                        {m.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="data-table__actions">
                      {m.id !== currentProfile.id && (
                        <>
                          <button
                            className="icon-btn"
                            title={m.actif ? 'Désactiver' : 'Réactiver'}
                            onClick={() => handleToggleActive(m)}
                          >
                            {m.actif ? <LuUserX /> : <LuUserCheck />}
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title="Retirer"
                            onClick={() => handleRemove(m)}
                          >
                            <LuTrash2 />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invitations.length > 0 && (
            <>
              <h2 className="section-title">Invitations en attente ({invitations.length})</h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Expire le</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((i) => (
                      <tr key={i.id}>
                        <td className="data-table__title">{i.nom_complet}</td>
                        <td>{i.email}</td>
                        <td>{ROLE_LABELS[i.role]}</td>
                        <td>{new Date(i.expires_at).toLocaleDateString('fr-FR')}</td>
                        <td className="data-table__actions">
                          <button
                            className="icon-btn"
                            title="Copier le lien d'invitation"
                            onClick={() => copyLink(i.token, i.id)}
                          >
                            {copiedId === i.id ? <LuCheck /> : <LuCopy />}
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title="Révoquer"
                            onClick={() => handleRevoke(i)}
                          >
                            <LuTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {inviteOpen && (
        <InviteMemberModal
          onClose={() => setInviteOpen(false)}
          onSaved={(invitation) => {
            setInviteOpen(false);
            setNewLink(inviteLink(invitation.token));
            loadAll();
          }}
        />
      )}
    </div>
  );
}
