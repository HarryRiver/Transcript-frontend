import { useState, useEffect, useRef } from 'react';
import { useTranscribeStore } from '../store/useTranscribeStore';
import { Search, Download, Copy, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hàm helper để định dạng giây thành HH:MM:SS,mmm
const formatTimeDetails = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  const pad = (num, len = 2) => String(num).padStart(len, '0');
  
  return {
    hh: pad(h),
    mm: pad(m),
    ss: pad(s),
    ms: pad(ms, 3)
  };
};

const formatTimeShort = (seconds) => {
  const { mm, ss } = formatTimeDetails(seconds);
  return `${mm}:${ss}`;
};

export default function TranscriptViewer() {
  const { t } = useTranslation();
  const result = useTranscribeStore((state) => state.result);
  const currentTime = useTranscribeStore((state) => state.currentTime);
  const getPlayerRef = useTranscribeStore((state) => state.getPlayerRef);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const activeSegmentRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Tìm segment đang hoạt động dựa trên currentTime
  const activeSegmentIndex = result?.segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  // Tự động cuộn theo từ đang đọc (Auto scroll)
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  if (!result) return null;

  // Xử lý click để nhảy tới giây tương ứng
  const handleSegmentClick = (start) => {
    const el = getPlayerRef();
    if (el) {
      el.currentTime = start;
      el.play().catch(() => {});
    }
  };

  // Copy toàn bộ text
  const handleCopyText = () => {
    const fullText = result.segments.map((s) => s.text).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Xuất file
  const exportFile = (type) => {
    let content = '';
    let filename = `${result.filename || 'transcript'}`;
    let mimeType = 'text/plain';

    if (type === 'txt') {
      content = result.segments.map((s) => `[${formatTimeShort(s.start)}] ${s.text}`).join('\n');
      filename += '.txt';
    } else if (type === 'srt') {
      content = result.segments.map((s, idx) => {
        const start = formatTimeDetails(s.start);
        const end = formatTimeDetails(s.end);
        return `${idx + 1}\n${start.hh}:${start.mm}:${start.ss},${start.ms} --> ${end.hh}:${end.mm}:${end.ss},${end.ms}\n${s.text}\n`;
      }).join('\n');
      filename += '.srt';
    } else if (type === 'vtt') {
      content = 'WEBVTT\n\n' + result.segments.map((s, idx) => {
        const start = formatTimeDetails(s.start);
        const end = formatTimeDetails(s.end);
        return `${idx + 1}\n${start.hh}:${start.mm}:${start.ss}.${start.ms} --> ${end.hh}:${end.mm}:${end.ss}.${end.ms}\n${s.text}\n`;
      }).join('\n');
      filename += '.vtt';
    } else if (type === 'json') {
      content = JSON.stringify(result, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Lọc segments dựa trên từ khóa tìm kiếm
  const filteredSegments = result.segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper để highlight từ khóa tìm kiếm
  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-brand-primary/30 text-brand-primary-hover rounded px-0.5 border border-brand-primary/20">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden">
      {/* Top bar controls */}
      <div className="p-4 border-b border-white/5 bg-slate-950/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('viewer.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-primary focus:bg-white/[0.08] transition-all"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative">
          {/* Auto scroll toggle */}
          <label className="btn-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-brand-primary"
            />
            {t('viewer.autoScroll')}
          </label>

          <button
            onClick={handleCopyText}
            className="btn-secondary"
            title={t('viewer.copy')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('viewer.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('viewer.copy')}</span>
              </>
            )}
          </button>

          {/* Export Dropdown */}
          <div>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-accent"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('viewer.download')}</span>
            </button>

            {showExportMenu && (
              <>
                {/* Backdrop overlay to close menu */}
                <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-30 flex flex-col gap-1">
                  <button
                    onClick={() => exportFile('txt')}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-lg text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {t('viewer.exportTxt')}
                  </button>
                  <button
                    onClick={() => exportFile('srt')}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-lg text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-primary-hover" />
                    {t('viewer.exportSrt')}
                  </button>
                  <button
                    onClick={() => exportFile('vtt')}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-lg text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-accent-hover" />
                    {t('viewer.exportVtt')}
                  </button>
                  <button
                    onClick={() => exportFile('json')}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-lg text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    {t('viewer.exportJson')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Language metadata banner */}
      <div className="px-4 py-2 bg-brand-primary/5 border-b border-white/5 text-[11px] text-slate-400 flex justify-between">
        <span>{t('viewer.detectedLanguage')}: <strong className="text-brand-primary-hover uppercase">{result.language}</strong> ({t('viewer.confidence')}: {(result.language_probability * 100).toFixed(0)}%)</span>
        <span>{t('viewer.duration')}: <strong>{result.duration}s</strong></span>
      </div>

      {/* Transcript Scrolling Panel */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[500px]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            {searchQuery ? t('viewer.noResult') : t('viewer.noData')}
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isSegmentActive = activeSegmentIndex === result.segments.indexOf(seg);
            
            return (
              <div
                key={seg.id}
                ref={isSegmentActive ? activeSegmentRef : null}
                onClick={() => handleSegmentClick(seg.start)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-300 flex items-start gap-3 border ${
                  isSegmentActive
                    ? 'bg-brand-primary/10 border-brand-primary/30 shadow-lg shadow-brand-primary-glow'
                    : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03] hover:border-white/5'
                }`}
              >
                {/* Timestamp tag */}
                <span className={`text-xs px-2 py-0.5 rounded-full select-none mt-0.5 ${
                  isSegmentActive
                    ? 'bg-brand-primary/20 text-brand-primary-hover border border-brand-primary/20'
                    : 'bg-white/5 text-slate-400'
                }`}>
                  {formatTimeShort(seg.start)}
                </span>
                
                {/* Text block */}
                <p className={`text-[14px] leading-relaxed transition-colors flex-1 ${
                  isSegmentActive ? 'text-white font-medium' : 'text-slate-300'
                }`}>
                  {highlightText(seg.text, searchQuery)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
