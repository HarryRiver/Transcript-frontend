import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

export const useTranscribeStore = create((set, get) => ({
  file: null,
  fileName: '',
  fileSize: '',
  fileType: null, // 'audio' | 'video' | null
  fileUrl: null, // object URL for previewing in player
  
  settings: {
    model: 'base',
    language: '', // empty string means Auto-Detect
  },
  
  status: 'idle', // 'idle' | 'uploading' | 'converting' | 'transcribing' | 'completed' | 'error'
  error: null,
  uploadProgress: 0,
  result: null, // { language, duration, segments: [...] }
  
  // Media playback synchronization
  currentTime: 0,
  isPlaying: false,
  playerRef: null,
  
  transcribeType: 'file', // 'file' | 'url'
  videoUrl: '',

  setFile: (file) => {
    if (!file) {
      // Clean up previous URL
      const currentUrl = get().fileUrl;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      
      set({ 
        file: null, 
        fileName: '', 
        fileSize: '', 
        fileType: null, 
        fileUrl: null,
        status: 'idle',
        result: null,
        error: null,
        uploadProgress: 0
      });
      return;
    }

    const type = file.type.startsWith('video/') ? 'video' : 'audio';
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const url = URL.createObjectURL(file);

    set({
      file,
      fileName: file.name,
      fileSize: sizeInMB,
      fileType: type,
      fileUrl: url,
      status: 'idle',
      result: null,
      error: null,
      uploadProgress: 0
    });
  },

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlayerRef: (ref) => set({ playerRef: ref }),
  getPlayerRef: () => get().playerRef,
  setTranscribeType: (transcribeType) => set({ transcribeType }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),

  reset: () => {
    const currentUrl = get().fileUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    
    set({
      file: null,
      fileName: '',
      fileSize: '',
      fileType: null,
      fileUrl: null,
      transcribeType: 'file',
      videoUrl: '',
      status: 'idle',
      error: null,
      uploadProgress: 0,
      result: null,
      currentTime: 0,
      isPlaying: false
    });
  },

  startTranscription: async () => {
    const { file, videoUrl, transcribeType, settings } = get();
    
    if (transcribeType === 'file' && !file) {
      set({ error: 'store.selectFileError' });
      return;
    }
    if (transcribeType === 'url' && (!videoUrl || !videoUrl.trim())) {
      set({ error: 'store.enterUrlError' });
      return;
    }

    set({ status: 'uploading', uploadProgress: 0, error: null, result: null });

    if (transcribeType === 'file') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', settings.model);
      formData.append('language', settings.language);

      try {
        const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted === 100) {
              set({ status: 'transcribing', uploadProgress: 100 });
            } else {
              set({ uploadProgress: percentCompleted });
            }
          },
        });

        set({ result: response.data, status: 'completed' });
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.detail || 'store.unknownError';
        set({ error: errorMsg, status: 'error' });
      }
    } else {
      // URL Transcription
      try {
        const response = await axios.post(`${API_BASE_URL}/transcribe-url`, {
          url: videoUrl,
          model: settings.model,
          language: settings.language
        });
        set({ result: response.data, status: 'completed' });
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.detail || 'store.unknownError';
        set({ error: errorMsg, status: 'error' });
      }
    }
  }
}));
