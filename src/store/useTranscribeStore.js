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

  reset: () => {
    const currentUrl = get().fileUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    
    set({
      file: null,
      fileName: '',
      fileSize: '',
      fileType: null,
      fileUrl: null,
      status: 'idle',
      error: null,
      uploadProgress: 0,
      result: null,
      currentTime: 0,
      isPlaying: false
    });
  },

  startTranscription: async () => {
    const { file, settings } = get();
    if (!file) {
      set({ error: 'store.selectFileError' });
      return;
    }

    set({ status: 'uploading', uploadProgress: 0, error: null, result: null });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', settings.model);
    formData.append('language', settings.language);

    try {
      // Send request with upload progress monitoring
      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          if (percentCompleted === 100) {
            // Server starts conversion & transcription after receiving the file
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
  }
}));
