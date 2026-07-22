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
import { useLanguage } from '../../contexts/LanguageContext';
import './Landing.css';

const MARQUEE_ICONS = [LuFileText, LuPenTool, LuStamp, LuReceipt];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const FEATURES = [
    { icon: LuPackage, title: t('landing.feature1Title'), description: t('landing.feature1Description') },
    { icon: LuShoppingCart, title: t('landing.feature2Title'), description: t('landing.feature2Description') },
    { icon: LuCalculator, title: t('landing.feature3Title'), description: t('landing.feature3Description') },
    { icon: LuPrinter, title: t('landing.feature4Title'), description: t('landing.feature4Description') },
    { icon: LuUserCog, title: t('landing.feature5Title'), description: t('landing.feature5Description') },
    { icon: LuChartColumn, title: t('landing.feature6Title'), description: t('landing.feature6Description') },
  ];

  const PRICING_ITEMS = [
    t('landing.pricingItem1'),
    t('landing.pricingItem2'),
    t('landing.pricingItem3'),
    t('landing.pricingItem4'),
    t('landing.pricingItem5'),
    t('landing.pricingItem6'),
  ];

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

        <div className="landing__nav-actions">
          <button
            className="icon-btn landing__nav-toggle landing__nav-lang"
            onClick={toggleLanguage}
            aria-label={t('nav.toggleLanguage')}
          >
            {language.toUpperCase()}
          </button>
          <button className="icon-btn landing__nav-toggle" onClick={toggleTheme} aria-label={t('landing.toggleTheme')}>
            {theme === 'dark' ? <LuSun /> : <LuMoon />}
          </button>
        </div>
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

          <h1>{t('landing.heroTitle')}</h1>
          <p>{t('landing.heroSubtitle')}</p>
          <div className="landing__hero-actions">
            <Link to="/inscription" className="btn btn--primary landing__cta">
              {t('landing.createAccount')}
            </Link>
            <Link to="/connexion" className="btn btn--ghost landing__cta">
              {t('landing.alreadyHaveAccount')}
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="landing__section">
        <h2>{t('landing.featuresTitle')}</h2>
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
        <h2>{t('landing.pricingTitle')}</h2>
        <motion.div
          className="landing__pricing-card"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
        >
          <div className="landing__pricing-amount">
            5 500 <span>{t('landing.pricingPerMonth')}</span>
          </div>
          <p className="landing__pricing-hint">{t('landing.pricingHint')}</p>
          <ul className="landing__pricing-list">
            {PRICING_ITEMS.map((item) => (
              <li key={item}>
                <LuCheck /> {item}
              </li>
            ))}
          </ul>
          <Link to="/inscription" className="btn btn--primary landing__cta">
            {t('landing.startNow')}
          </Link>
        </motion.div>
      </section>

      <footer className="landing__footer">
        <span>
          © {new Date().getFullYear()} QuincaPro — {t('landing.footerRights')}
        </span>
      </footer>
    </div>
  );
}
