import { useState, useRef } from 'react';
import { Upload, FileAudio, FileVideo, AlertCircle, Link2, Globe, Play } from 'lucide-react';
import { useTranscribeStore } from '../store/useTranscribeStore';
import { useTranslation } from 'react-i18next';
import { 
  ALLOWED_EXTENSIONS, 
  ALLOWED_AUDIO_EXTENSIONS, 
  ALLOWED_VIDEO_EXTENSIONS 
} from '../config/constants';

export default function UploadZone() {
  const { t } = useTranslation();
  
  // Trạng thái từ Zustand store
  const setFile = useTranscribeStore((state) => state.setFile);
  const videoUrl = useTranscribeStore((state) => state.videoUrl);
  const setVideoUrl = useTranscribeStore((state) => state.setVideoUrl);
  const transcribeType = useTranscribeStore((state) => state.transcribeType);
  const setTranscribeType = useTranscribeStore((state) => state.setTranscribeType);
  const startTranscription = useTranscribeStore((state) => state.startTranscription);
  const status = useTranscribeStore((state) => state.status);
  const error = useTranscribeStore((state) => state.error);

  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    const ext = file.name.split('.').pop().toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);

    if (isAudio || isVideo || isAllowedExt) {
      setFile(file);
    } else {
      alert(t('upload.formatError'));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  const handleTabChange = (type) => {
    setTranscribeType(type);
    if (type === 'file') {
      setVideoUrl('');
    } else {
      setFile(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Thanh chọn Tab */}
      <div className="flex border border-white/5 p-1 bg-white/2 rounded-xl">
        <button
          type="button"
          onClick={() => handleTabChange('file')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
            transcribeType === 'file'
              ? 'bg-brand-primary text-white shadow-md shadow-brand-primary-glow/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {t('upload.tabFile')}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('url')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
            transcribeType === 'url'
              ? 'bg-brand-primary text-white shadow-md shadow-brand-primary-glow/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          {t('upload.tabUrl')}
        </button>
      </div>

      {/* Nội dung Tab */}
      {transcribeType === 'file' ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={isDragActive ? 'upload-zone upload-zone-active' : 'upload-zone'}
        >
          <div className="upload-zone-overlay" />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
            onChange={handleChange}
          />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={isDragActive ? 'upload-zone-icon-wrapper upload-zone-icon-wrapper-active' : 'upload-zone-icon-wrapper'}>
              <Upload className="upload-icon" />
            </div>

            <div>
              <p className="text-base font-semibold text-text-primary">
                {t('upload.dragDropText')}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {t('upload.orChoose')} <span className="text-brand-primary-hover font-medium group-hover:underline">{t('upload.selectFile')}</span>
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-text-secondary mt-2 border-t border-white/5 pt-4 w-full max-w-sm">
              <div className="flex items-center gap-1">
                <FileAudio className="w-3.5 h-3.5 text-text-secondary" />
                <span>{ALLOWED_AUDIO_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileVideo className="w-3.5 h-3.5 text-text-secondary" />
                <span>{ALLOWED_VIDEO_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-text-muted bg-white/2 px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              <span>{t('upload.limitInfo')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 text-brand-primary-hover">
            <Globe className="w-8 h-8" />
          </div>

          <div className="w-full text-center">
            <h3 className="text-base font-semibold text-text-primary">
              {t('upload.urlTitle')}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
              {t('upload.urlSubtitle')}
            </p>
          </div>

          <div className="w-full max-w-md mt-2 flex flex-col gap-3">
            <input
              type="url"
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:bg-white/10 transition-all"
            />
            {status === 'error' && error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <strong className="font-semibold block">{t('app.errorTitle')}</strong>
                  <span className="mt-0.5 block opacity-90">{t(error)}</span>
                </div>
              </div>
            )}
            {videoUrl.trim() !== '' && (
              <button
                type="button"
                onClick={startTranscription}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                {t('app.startBtn')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-text-muted bg-white/2 px-3 py-1 rounded-full mt-2">
            <AlertCircle className="w-3 h-3" />
            <span>{t('upload.urlLimitInfo')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
