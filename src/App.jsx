import { useTranscribeStore } from './store/useTranscribeStore';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import MediaPlayer from './components/MediaPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import { Play, RotateCcw, AlertCircle, Sparkles, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: '', name: 'settings.languages.auto' },
  { code: 'vi', name: 'settings.languages.vi' },
  { code: 'en', name: 'settings.languages.en' },
  { code: 'ja', name: 'settings.languages.ja' },
  { code: 'zh', name: 'settings.languages.zh' },
  { code: 'ko', name: 'settings.languages.ko' },
  { code: 'fr', name: 'settings.languages.fr' },
  { code: 'de', name: 'settings.languages.de' }
];

const MODELS = [
  { id: 'tiny', name: 'settings.models.tiny', vram: '~75MB VRAM' },
  { id: 'base', name: 'settings.models.base', vram: '~140MB VRAM' },
  { id: 'small', name: 'settings.models.small', vram: '~460MB VRAM' },
  { id: 'medium', name: 'settings.models.medium', vram: '~1.5GB VRAM' }
];

export default function App() {
  const { t } = useTranslation();
  
  const file = useTranscribeStore((state) => state.file);
  const status = useTranscribeStore((state) => state.status);
  const uploadProgress = useTranscribeStore((state) => state.uploadProgress);
  const error = useTranscribeStore((state) => state.error);
  const settings = useTranscribeStore((state) => state.settings);
  const setSettings = useTranscribeStore((state) => state.setSettings);
  const startTranscription = useTranscribeStore((state) => state.startTranscription);
  const reset = useTranscribeStore((state) => state.reset);
  const result = useTranscribeStore((state) => state.result);
  const transcribeType = useTranscribeStore((state) => state.transcribeType);

  const handleLanguageChange = (e) => {
    setSettings({ language: e.target.value });
  };

  const handleModelChange = (e) => {
    setSettings({ model: e.target.value });
  };

  return (
    <div className="min-h-screen bg-linear-to-tr from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col antialiased pb-12">
      {/* 1. Header */}
      <Header />

      {/* 2. Main Content Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Control Panel, Drag & Drop, Media Player */}
        <section className="lg:col-span-5 flex flex-col gap-6 w-full">
          
          {/* Settings Card */}
          <div className="glass-panel rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
            <h2 className="text-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary-hover" /> {t('settings.title')}
            </h2>

            {/* Model size selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">{t('settings.modelLabel')}</label>
              <select
                value={settings.model}
                onChange={handleModelChange}
                disabled={status !== 'idle' && status !== 'error'}
                className="input-select"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                    {t(m.name)} ({m.vram})
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">{t('settings.languageLabel')}</label>
              <select
                value={settings.language}
                onChange={handleLanguageChange}
                disabled={status !== 'idle' && status !== 'error'}
                className="input-select"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                    {t(l.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload and File display panel */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {!file && (status === 'idle' || status === 'error' || (status === 'transcribing' && transcribeType === 'record')) ? (
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <UploadZone />
                </motion.div>
              ) : (
                <motion.div
                  key="media-player"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  <MediaPlayer />

                  {/* Run / Progress panel */}
                  <div className="glass-panel rounded-2xl border border-white/5 p-4 flex flex-col gap-4">
                    
                    {/* Idle state: Show action button */}
                    {(status === 'idle' || status === 'error') && transcribeType === 'file' && (
                      <button
                        onClick={startTranscription}
                        className="btn-primary"
                      >
                        <Play className="w-4 h-4 fill-white" /> {t('app.startBtn')}
                      </button>
                    )}

                    {/* Uploading State */}
                    {status === 'uploading' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-medium text-slate-300">
                          <span>{transcribeType === 'file' ? t('app.uploading') : t('app.downloadingUrl')}</span>
                          {transcribeType === 'file' && <span>{uploadProgress}%</span>}
                        </div>
                        {transcribeType === 'file' ? (
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                            <motion.div
                              className="bg-linear-to-r from-brand-primary to-brand-accent h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5 relative">
                            <motion.div
                              className="bg-linear-to-r from-brand-primary to-brand-accent h-full rounded-full w-1/3 absolute"
                              animate={{
                                left: ['-33%', '100%']
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                ease: "linear"
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transcribing State */}
                    {status === 'transcribing' && (
                      <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
                        <Loader2 className="w-8 h-8 text-brand-primary-hover animate-spin" />
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{t('app.transcribing')}</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                            {t('app.gpuAlert')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Completed State: Option to run again/different config */}
                    {status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 flex-1">
                          {t('app.completedAlert')}
                        </span>
                        <button
                          onClick={reset}
                          className="btn-secondary"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> {t('app.resetBtn')}
                        </button>
                      </div>
                    )}

                    {/* Error Alert Box */}
                    {status === 'error' && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <strong className="font-semibold block">{t('app.errorTitle')}</strong>
                          <span className="mt-0.5 block opacity-90">{t(error)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Column: Transcript Viewport */}
        <section className="lg:col-span-7 w-full h-[580px]">
          <AnimatePresence mode="wait">
            {(status === 'completed' || (status === 'transcribing' && transcribeType === 'record')) && result ? (
              <motion.div
                key="transcript-viewer"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="h-full"
              >
                <TranscriptViewer />
              </motion.div>
            ) : (
              <motion.div
                key="transcript-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full rounded-2xl border border-white/5 bg-white/1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-center text-slate-500 mb-4">
                  {status === 'transcribing' || status === 'uploading' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary-hover" />
                  ) : (
                    <FileText className="w-8 h-8 opacity-40 text-slate-400" />
                  )}
                </div>
                
                {status === 'transcribing' || status === 'uploading' ? (
                  <>
                    <h3 className="text-base font-semibold text-slate-200">{t('app.preparingTitle')}</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      {t('app.preparingDesc')}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-slate-400">{t('app.noDataTitle')}</h3>
                    <p className="text-sm text-slate-600 max-w-sm mt-1">
                      {t('app.noDataDesc')}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        
      </main>
    </div>
  );
}
