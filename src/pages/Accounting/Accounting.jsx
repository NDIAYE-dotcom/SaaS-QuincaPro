import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { fetchAccounts, fetchEntries, fetchBalance, fetchLedgerLines } from '../../services/accountingService';
import { useLanguage } from '../../contexts/LanguageContext';
import JournalTab from './JournalTab';
import LedgerTab from './LedgerTab';
import BalanceTab from './BalanceTab';
import ReportsTab from './ReportsTab';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import NewEntryModal from './NewEntryModal';
import './Accounting.css';

export default function Accounting() {
  const { t } = useLanguage();
  const TABS = [
    { id: 'journal', label: t('accounting.tabJournal') },
    { id: 'grand-livre', label: t('accounting.tabLedger') },
    { id: 'balance', label: t('accounting.tabBalance') },
    { id: 'rapports', label: t('accounting.tabReports') },
    { id: 'plan-comptable', label: t('accounting.tabChart') },
  ];
  const [activeTab, setActiveTab] = useState('journal');
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState([]);
  const [ledgerLines, setLedgerLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accountsData, entriesData, balanceData, ledgerData] = await Promise.all([
        fetchAccounts(),
        fetchEntries(),
        fetchBalance(),
        fetchLedgerLines(),
      ]);
      setAccounts(accountsData);
      setEntries(entriesData);
      setBalance(balanceData);
      setLedgerLines(ledgerData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleEntrySaved() {
    setEntryModalOpen(false);
    loadAll();
  }

  return (
    <div className="accounting">
      <div className="page-header">
        <div>
          <h1>{t('accounting.title')}</h1>
          <p>{t('accounting.subtitle')}</p>
        </div>
        {activeTab === 'journal' && (
          <button className="btn btn--primary" onClick={() => setEntryModalOpen(true)}>
            <LuPlus /> {t('accounting.newEntry')}
          </button>
        )}
      </div>

      <div className="accounting__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`accounting__tab ${activeTab === tab.id ? 'accounting__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : (
        <>
          {activeTab === 'journal' && <JournalTab entries={entries} />}
          {activeTab === 'grand-livre' && <LedgerTab lines={ledgerLines} accounts={accounts} />}
          {activeTab === 'balance' && <BalanceTab balance={balance} />}
          {activeTab === 'rapports' && <ReportsTab balance={balance} />}
          {activeTab === 'plan-comptable' && <ChartOfAccountsTab accounts={accounts} onChanged={loadAll} />}
        </>
      )}

      {entryModalOpen && (
        <NewEntryModal accounts={accounts} onClose={() => setEntryModalOpen(false)} onSaved={handleEntrySaved} />
      )}
    </div>
  );
}
