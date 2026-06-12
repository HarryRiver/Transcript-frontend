import { Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  return (
    <header className="w-full py-4 px-6 border-b border-white/5 glass-panel sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-brand-primary to-brand-accent p-2.5 rounded-xl shadow-lg shadow-brand-primary-glow">
          <Cpu className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="header-title">
            TranscribeAI
          </h1>
          <p className="header-subtitle">{t('header.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Switcher Toggle */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
          <button
            onClick={() => i18n.changeLanguage('vi')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentLang.startsWith('vi')
                ? 'bg-brand-primary text-white shadow'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            VI
          </button>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentLang.startsWith('en')
                ? 'bg-brand-primary text-white shadow'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
