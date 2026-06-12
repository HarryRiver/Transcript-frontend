import { useState, useRef } from 'react';
import { Upload, FileAudio, FileVideo, AlertCircle } from 'lucide-react';
import { useTranscribeStore } from '../store/useTranscribeStore';
import { useTranslation } from 'react-i18next';
import { 
  ALLOWED_EXTENSIONS, 
  ALLOWED_AUDIO_EXTENSIONS, 
  ALLOWED_VIDEO_EXTENSIONS 
} from '../config/constants';

export default function UploadZone() {
  const { t } = useTranslation();
  const setFile = useTranscribeStore((state) => state.setFile);
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
    
    // Check if the file is audio or video
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    
    // Fallback detection by extension
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

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={isDragActive ? 'upload-zone upload-zone-active' : 'upload-zone'}
    >
      {/* Decorative gradient overlay */}
      <div className="upload-zone-overlay" />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
        onChange={handleChange}
      />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Animated Icon Circle */}
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

        {/* Formats supported */}
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

        <div className="flex items-center gap-1 text-[11px] text-text-muted bg-white/[0.02] px-3 py-1 rounded-full">
          <AlertCircle className="w-3 h-3" />
          <span>{t('upload.limitInfo')}</span>
        </div>
      </div>
    </div>
  );
}
