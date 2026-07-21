import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LuPackage,
  LuShoppingCart,
  LuCalculator,
  LuUserCog,
  LuChartColumn,
  LuPrinter,
  LuCheck,
  LuSun,
  LuMoon,
  LuFileText,
  LuPenTool,
  LuStamp,
  LuReceipt,
} from 'react-icons/lu';
import { useTheme } from '../../contexts/ThemeContext';
import './Landing.css';

const MARQUEE_ICONS = [LuFileText, LuPenTool, LuStamp, LuReceipt];

const FEATURES = [
  {
    icon: LuPackage,
    title: 'Produits & Stock',
    description: 'Catégories, photos, code-barres, seuils d\'alerte et mouvements tracés en temps réel.',
  },
  {
    icon: LuShoppingCart,
    title: 'Ventes & Achats',
    description: 'Devis, factures TVA/HT, paiements partiels, dettes clients et fournisseurs.',
  },
  {
    icon: LuCalculator,
    title: 'Comptabilité SYSCOHADA',
    description: 'Journal, grand livre, balance et écritures automatiques à chaque vente ou achat.',
  },
  {
    icon: LuPrinter,
    title: 'Factures professionnelles',
    description: 'PDF A4 ou thermique 80/58mm, logo, QR code et numérotation automatique.',
  },
  {
    icon: LuUserCog,
    title: 'Équipe & rôles',
    description: 'Invitez Caissiers, Magasiniers, Comptables... chacun avec un accès adapté.',
  },
  {
    icon: LuChartColumn,
    title: 'Rapports exportables',
    description: 'Ventes, bénéfices, TVA, stock et plus — exportés en PDF, Excel ou CSV.',
  },
];

const PRICING_ITEMS = [
  'Produits, stock et ventes illimités',
  'Comptabilité automatique',
  'Facturation PDF & impression thermique',
  'Équipe multi-utilisateurs avec rôles',
  'Rapports et exports illimités',
  'Support par email',
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="landing">
      <header className="landing__nav">
        <div className="landing__nav-spacer" aria-hidden="true" />

        <div className="landing__brand">
          {theme === 'dark' ? (
            <img src="/logo-icon-dark.png" alt="QuincaPro" className="landing__brand-mark" />
          ) : (
            <img src="/logo-full-light.png" alt="Gestion Quincaillerie" className="landing__brand-full" />
          )}
        </div>

        <button className="icon-btn landing__nav-toggle" onClick={toggleTheme} aria-label="Basculer le thème">
          {theme === 'dark' ? <LuSun /> : <LuMoon />}
        </button>
      </header>

      <section className="landing__hero">
        <motion.div
          className="landing__hero-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="landing__marquee" aria-hidden="true">
            <motion.div
              className="landing__marquee-track"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            >
              {[...MARQUEE_ICONS, ...MARQUEE_ICONS].map((Icon, index) => (
                <div className="landing__marquee-icon" key={index}>
                  <Icon />
                </div>
              ))}
            </motion.div>
          </div>

          <h1>La gestion de votre quincaillerie, simplifiée.</h1>
          <p>Stock, ventes et comptabilité réunis dans un outil simple, pensé pour votre commerce.</p>
          <div className="landing__hero-actions">
            <Link to="/inscription" className="btn btn--primary landing__cta">
              Créer mon compte
            </Link>
            <Link to="/connexion" className="btn btn--ghost landing__cta">
              J'ai déjà un compte
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="landing__section">
        <h2>Tout ce qu'il faut pour gérer votre commerce</h2>
        <div className="landing__features">
          {FEATURES.map(({ icon: Icon, title, description }, index) => (
            <motion.div
              key={title}
              className="landing__feature-card"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
            >
              <div className="landing__feature-icon">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="landing__section landing__section--pricing">
        <h2>Un prix simple, sans surprise</h2>
        <motion.div
          className="landing__pricing-card"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
        >
          <div className="landing__pricing-amount">
            5 500 <span>FCFA / mois</span>
          </div>
          <p className="landing__pricing-hint">Sans engagement. Paiement via Wave, Orange Money ou Free Money.</p>
          <ul className="landing__pricing-list">
            {PRICING_ITEMS.map((item) => (
              <li key={item}>
                <LuCheck /> {item}
              </li>
            ))}
          </ul>
          <Link to="/inscription" className="btn btn--primary landing__cta">
            Démarrer maintenant
          </Link>
        </motion.div>
      </section>

      <footer className="landing__footer">
        <span>© {new Date().getFullYear()} QuincaPro — Tous droits réservés.</span>
      </footer>
    </div>
  );
}
