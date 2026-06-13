import { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, FileVideo, AlertCircle, Link2, Globe, Play, Mic, Square } from 'lucide-react';
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

  // Trạng thái cho Ghi âm
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordSource, setRecordSource] = useState('mic');
  const [recordMode, setRecordMode] = useState('offline');
  const [recordError, setRecordError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  
  // Refs cho Live mode
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const committedSegmentsRef = useRef([]);

  // Dọn dẹp luồng âm thanh, Web Audio và WebSocket khi component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setRecordError(null);
    try {
      const settings = useTranscribeStore.getState().settings;
      
      // Khởi tạo luồng âm thanh
      let stream;
      if (recordSource === 'mic') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // Thu âm tiếng cuộc họp (Google Meet/Zoom) - Tab Share Audio
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach(track => track.stop());
          setRecordError(t('upload.recordDeviceError'));
          return;
        }
        // Tắt track video ngay lập tức vì ta chỉ cần audio
        stream.getVideoTracks().forEach(track => track.stop());
        stream = new MediaStream(audioTracks);
      }
      
      streamRef.current = stream;

      // Xử lý theo từng chế độ
      if (recordMode === 'offline') {
        const options = { mimeType: 'audio/webm' };
        const recorder = new MediaRecorder(
          stream, 
          MediaRecorder.isTypeSupported('audio/webm') ? options : undefined
        );
        
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const fileObj = new File(
            [audioBlob], 
            `ghi_am_${recordSource === 'mic' ? 'mic' : 'meeting'}_${Date.now()}.webm`, 
            { type: 'audio/webm' }
          );
          
          setFile(fileObj);
          setTranscribeType('file');
          setIsRecording(false);
          setRecordingDuration(0);
        };
        
        recorder.start(1000);
      } else {
        // CHẾ ĐỘ LIVE STREAMING (WS)
        // Reset kết quả hiển thị của live transcription
        committedSegmentsRef.current = [];
        useTranscribeStore.setState({ 
          status: 'transcribing', 
          result: { language: settings.language || 'auto', duration: 0, segments: [] } 
        });

        // Kết nối WebSocket lên Backend
        const wsUrl = `ws://127.0.0.1:8000/api/stream-transcribe?model=${settings.model}&language=${settings.language || ''}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error("Live transcription error:", data.error);
              return;
            }

            const segments = data.segments || [];
            const isFinal = data.is_final;
            
            const committed = committedSegmentsRef.current;
            const currentSegments = [...committed, ...segments];

            // Cập nhật lên store để SubtitleViewer hiển thị
            useTranscribeStore.setState({
              result: {
                language: settings.language || 'auto',
                duration: currentSegments.length > 0 ? currentSegments[currentSegments.length - 1].end : 0,
                segments: currentSegments
              }
            });

            if (isFinal && segments.length > 0) {
              committedSegmentsRef.current = [...committed, ...segments];
            }
          } catch {
            // Bỏ qua lỗi parse gói tin rỗng
          }
        };

        ws.onerror = () => {
          setRecordError(t('store.unknownError'));
        };

        // Thiết lập bộ lọc downsample qua Web Audio
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        audioSourceRef.current = source;

        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          
          const inputBuffer = e.inputBuffer.getChannelData(0);
          const inputSampleRate = audioCtx.sampleRate;
          const outputSampleRate = 16000;
          
          const resampled = resample(inputBuffer, inputSampleRate, outputSampleRate);
          const int16Buffer = convertFloat32ToInt16(resampled);
          
          ws.send(int16Buffer.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      }
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Recording error:", err);
      setRecordError(t('upload.recordPermissionError'));
      setIsRecording(false);
      useTranscribeStore.setState({ status: 'idle' });
    }
  };

  const stopRecording = () => {
    if (recordMode === 'offline') {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      }
    } else {
      // DỪNG CHẾ ĐỘ LIVE STREAMING
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "close" }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }

      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      setIsRecording(false);
      setRecordingDuration(0);
      useTranscribeStore.setState({ status: 'completed' });
    }
  };

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
        <button
          type="button"
          onClick={() => handleTabChange('record')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
            transcribeType === 'record'
              ? 'bg-brand-primary text-white shadow-md shadow-brand-primary-glow/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          {t('upload.tabRecord')}
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
      ) : transcribeType === 'url' ? (
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
      ) : (
        /* Tab Ghi âm */
        <div className="w-full rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 text-brand-primary-hover relative">
            <Mic className={`w-8 h-8 ${isRecording ? 'animate-pulse text-rose-500' : ''}`} />
            {isRecording && (
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
            )}
          </div>

          <div className="w-full text-center">
            <h3 className="text-base font-semibold text-text-primary">
              {t('upload.recordTitle')}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
              {t('upload.recordSubtitle')}
            </p>
          </div>

          <div className="w-full max-w-md mt-2 flex flex-col gap-4">
            {/* Chọn nguồn âm thanh */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('upload.recordSource')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordSource('mic')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    recordSource === 'mic'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-hover'
                      : 'border-white/5 bg-white/2 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('upload.recordSourceMic')}
                </button>
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordSource('meet')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    recordSource === 'meet'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-hover'
                      : 'border-white/5 bg-white/2 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('upload.recordSourceMeet')}
                </button>
              </div>
            </div>

            {/* Chọn chế độ trích xuất */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">{t('upload.recordMode')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordMode('offline')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    recordMode === 'offline'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-hover'
                      : 'border-white/5 bg-white/2 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('upload.recordModeOffline')}
                </button>
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordMode('live')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    recordMode === 'live'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-hover'
                      : 'border-white/5 bg-white/2 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('upload.recordModeLive')}
                </button>
              </div>
            </div>

            {/* Hiển thị lỗi thiết bị/quyền nếu có */}
            {recordError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <span className="block opacity-90">{recordError}</span>
                </div>
              </div>
            )}

            {/* Thông tin thời gian ghi âm */}
            {isRecording && (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-200 bg-white/5 border border-white/5 py-2.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>{t('upload.recordingTime')} {formatDuration(recordingDuration)}</span>
              </div>
            )}

            {/* Nút bấm Ghi âm / Dừng */}
            <div className="mt-2">
              {recordMode === 'offline' ? (
                !isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    {t('upload.recordStart')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-600-glow/20 active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-white text-white" />
                    {t('upload.recordStop')}
                  </button>
                )
              ) : (
                /* Chế độ Live: Tải lên và hiển thị trực tiếp */
                !isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    {t('upload.recordLiveStart')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-600-glow/20 active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-white text-white" />
                    {t('upload.recordLiveStop')}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for downsampling and PCM conversion
function resample(inputBuffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) {
    return inputBuffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(inputBuffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0, count = 0;
    for (let i = offsetInput; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetInput = nextOffsetBuffer;
  }
  return result;
}

function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    let s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf;
}
