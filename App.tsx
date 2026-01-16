
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SyncStatus, UserData, ConnectionState } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as db from './services/db';

const MOCK_DATA: UserData[] = [
  { id: 'OS-001', title: 'Global Logistics Protocol', category: 'SECURITY', content: 'Standard encryption keys and routing tables for sub-zero environments.', timestamp: '2023-11-21', status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-002', title: 'Terminal Access Matrix', category: 'NETWORK', content: 'Local node mapping for isolated grid infrastructures.', timestamp: '2023-11-20', status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-003', title: 'Operational Field Manual', category: 'MANUAL', content: 'Step-by-step procedures for hardware maintenance without cloud parity.', timestamp: '2023-11-18', status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-004', title: 'Emergency Resync Patch', category: 'SYSTEM', content: 'Critical binary delta for synchronizing state after prolonged outage.', timestamp: '2023-11-22', status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dataList, setDataList] = useState<UserData[]>(MOCK_DATA);
  const [syncing, setSyncing] = useState(false);

  // Connection Monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial Load from local DB
    const loadLocal = async () => {
      const local = await db.getAllOfflineData();
      if (local.length > 0) {
        setDataList(prev => {
          const merged = [...prev];
          local.forEach(l => {
            const idx = merged.findIndex(p => p.id === l.id);
            if (idx !== -1) merged[idx] = l;
          });
          return merged;
        });
        setIsAuthorized(true); // Assume authorized if data exists locally
      }
    };
    loadLocal();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleConnect = useCallback(() => {
    // In production, this would trigger OAuth/Supabase Auth
    setSyncing(true);
    setTimeout(() => {
      setIsAuthorized(true);
      setSyncing(false);
    }, 1500);
  }, []);

  const handleDisconnect = useCallback(async () => {
    await db.clearLocalData();
    setDataList(MOCK_DATA);
    setIsAuthorized(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!isAuthorized || syncing) return;

    setSyncing(true);
    
    // Simulate staggered download
    for (const item of dataList) {
      if (item.status === SyncStatus.DOWNLOADED) continue;

      setDataList(prev => prev.map(d => 
        d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 10 } : d
      ));

      // Mock progress
      for (let p = 20; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 200));
        setDataList(prev => prev.map(d => 
          d.id === item.id ? { ...d, progress: p } : d
        ));
      }

      const updatedItem = { ...item, status: SyncStatus.DOWNLOADED, progress: 100 };
      await db.saveOfflineData(updatedItem);
      
      setDataList(prev => prev.map(d => d.id === item.id ? updatedItem : d));
    }

    setSyncing(false);
  }, [isAuthorized, syncing, dataList]);

  const stats = useMemo(() => {
    return {
      downloaded: dataList.filter(d => d.status === SyncStatus.DOWNLOADED).length,
      total: dataList.length
    };
  }, [dataList]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar / Branding */}
      <aside className="lg:w-1/3 p-12 lg:sticky lg:top-0 h-auto lg:h-screen flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#0a0a0a] z-10">
        <div className="stagger-in">
          <h1 className="text-6xl font-[900] leading-none mb-2 tracking-tighter">
            OFFGRID<br/><span className="text-[#d40511]">SYNC</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">
            Digital Sovereignty Layer
          </p>
          
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">{isOnline ? 'System Online' : 'Offline Mode Active'}</p>
                <p className="text-[10px] text-gray-600 font-mono">{isOnline ? 'Direct Cloud Interlink' : 'Local Archive Only'}</p>
              </div>
            </div>

            <div className="p-4 bg-[#111] border-l-2 border-[#d40511]">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Vault Status</p>
              <p className="text-2xl font-black">{stats.downloaded} / {stats.total}</p>
              <p className="text-[10px] text-gray-600 uppercase">Synchronized Blocks</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          {!isAuthorized ? (
            <CinematicButton 
              onClick={handleConnect} 
              label="Initiate Authorization" 
              className="w-full"
              disabled={syncing || !isOnline}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
            />
          ) : (
            <>
              <CinematicButton 
                onClick={handleDownload} 
                label={syncing ? "Syncing..." : "Sync Local Vault"} 
                className="w-full"
                disabled={syncing || !isOnline || stats.downloaded === stats.total}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
              />
              <CinematicButton 
                onClick={handleDisconnect} 
                variant="ghost" 
                label="Terminate Session" 
                className="w-full"
                disabled={syncing}
              />
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-12 lg:p-24 overflow-y-auto">
        <header className="mb-16 stagger-in">
          <span className="text-[#d40511] font-black text-sm tracking-widest uppercase">Overview</span>
          <h2 className="text-4xl lg:text-5xl font-black mt-4 tracking-tighter">Your data. Anytime. Anywhere.<br/>Even offline.</h2>
          <div className="mt-8 h-[1px] w-24 bg-[#d40511]" />
        </header>

        {!isAuthorized ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-800 rounded-lg">
             <svg className="w-16 h-16 text-gray-700 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             <h3 className="text-xl font-bold uppercase tracking-widest">Access Restricted</h3>
             <p className="text-gray-500 max-w-sm mt-2">Authorization required to establish local data parity. Connect your secure profile to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-800">
            {dataList.map((item) => (
              <DataCard key={item.id} data={item} />
            ))}
          </div>
        )}

        {/* Sync Info Footer */}
        <footer className="mt-24 flex flex-col lg:flex-row items-center justify-between text-gray-600 font-mono text-[10px] uppercase gap-4">
           <div className="flex gap-8">
             <span>Protocol: AES-256-GCM</span>
             <span>Storage: IndexedDB Standard v1.0</span>
           </div>
           <div>
             © 2024 OFFGRID SYNC LOGISTICS CORP.
           </div>
        </footer>
      </main>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-[#d40511] text-white py-2 px-4 text-center font-black text-xs tracking-widest z-50 animate-pulse">
          RUNNING ON LOCAL ARCHIVE // NETWORK LINK SEVERED
        </div>
      )}
    </div>
  );
};

export default App;
