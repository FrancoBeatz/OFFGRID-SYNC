
import { UserData, SyncStatus } from '../types';

const API_BASE = 'http://localhost:5000/api';

// Mock data to use when the backend is unreachable
const MOCK_REMOTE_DATA: UserData[] = [
  // Fixed: Added userId property to satisfy UserData interface
  { id: 'DATA-001', userId: 'system', title: 'Network Config Pack', category: 'WIFI', content: 'Pre-cached local network settings for high-speed offline access.', timestamp: '2024-05-10', lastModified: 1715340000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-002', userId: 'system', title: 'Offline Resource Bundle', category: 'SYSTEM', content: 'Core system assets and media files for disconnected browsing.', timestamp: '2024-05-12', lastModified: 1715512800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-003', userId: 'system', title: 'Field Operations Guide', category: 'MANUAL', content: 'Step-by-step procedures for manual network overrides.', timestamp: '2024-05-14', lastModified: 1715685600000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-004', userId: 'system', title: 'Security Auth Keys', category: 'AUTH', content: 'Encrypted tokens required for offline device verification.', timestamp: '2024-05-15', lastModified: 1715772000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-005', userId: 'system', title: 'Universal Map Data', category: 'GEO', content: 'High-resolution offline terrain mapping for global navigation.', timestamp: '2024-05-16', lastModified: 1715858400000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

export const fetchRemoteData = async (): Promise<UserData[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(`${API_BASE}/data`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.warn("API Unavailable, using cached simulation records. Error:", error);
    // Return mock data so the app stays functional without a running Node server
    return MOCK_REMOTE_DATA;
  }
};

export const syncRecordToRemote = async (data: UserData, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/data/${data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: "Cloud unreachable" };
  }
};
