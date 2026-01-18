
export enum SyncStatus {
  UNDOWNLOADED = 'UNDOWNLOADED',
  DOWNLOADING = 'DOWNLOADING',
  DOWNLOADED = 'DOWNLOADED',
  OUT_OF_SYNC = 'OUT_OF_SYNC'
}

export interface UserData {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: string;
  lastModified: number; // Unix timestamp for conflict resolution
  status: SyncStatus;
  progress: number;
  isDirty?: boolean; // Flag for pending local changes
}

export interface ConnectionState {
  isOnline: boolean;
  isAuthorized: boolean;
  isSyncing: boolean;
}
