export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'flac', 'wma'];
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi', 'mov'];

export const ALLOWED_EXTENSIONS = [...ALLOWED_AUDIO_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

export const MAX_FILE_SIZE_MB = 500;
