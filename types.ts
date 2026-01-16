
export enum SyncStatus {
  UNDOWNLOADED = 'UNDOWNLOADED',
  DOWNLOADING = 'DOWNLOADING',
  DOWNLOADED = 'DOWNLOADED'
}

export interface UserData {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: string;
  status: SyncStatus;
  progress: number;
}

export interface ConnectionState {
  isOnline: boolean;
  isAuthorized: boolean;
}
