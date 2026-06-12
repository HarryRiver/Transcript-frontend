import { useEffect, useState } from 'react';
import axios from 'axios';
import { Cpu, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/constants';

export default function Header() {
  const { t, i18n } = useTranslation();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        if (active) setHealth(response.data);
      } catch {
        if (active) setHealth({ status: 'offline' });
      } finally {
        if (active) setLoading(false);
      }
    };

    checkHealth();

    // Poll health status every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const currentLang = i18n.language || 'vi';

  return (
    <header className="w-full py-4 px-6 border-b border-white/5 glass-panel sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-brand-primary to-brand-accent p-2.5 rounded-xl shadow-lg shadow-brand-primary-glow">
          <Cpu className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tight m-0 leading-none">
            TranscribeAI
          </h1>
          <p className="text-xs text-slate-400 mt-1 m-0">{t('header.subtitle')}</p>
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
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VI
          </button>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentLang.startsWith('en')
                ? 'bg-brand-primary text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>

        {loading ? (
          <div className="badge-status-loading">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {t('header.checking')}
          </div>
        ) : health?.status === 'ok' ? (
          <div className="flex items-center gap-4">
            {/* GPU Info */}
            {health.cuda?.available && (
              <div className="hidden sm:flex badge-status-gpu">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary-hover animate-ping"></span>
                <span>{t('header.gpuActive')}: {health.cuda.gpu_name}</span>
              </div>
            )}
            {/* Connection Status */}
            <div className="badge-status-ok">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t('header.online')}</span>
            </div>
          </div>
        ) : (
          <div className="badge-status-err">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('header.offline')}</span>
          </div>
        )}
      </div>
    </header>
  );
}
