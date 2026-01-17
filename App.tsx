
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as db from './services/db';

const REMOTE_SOURCE: UserData[] = [
  { id: 'DATA-001', title: 'Network Config Pack', category: 'WIFI', content: 'Pre-cached local network settings for high-speed offline access.', timestamp: '2024-05-10', lastModified: 1715340000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-002', title: 'Offline Resource Bundle', category: 'SYSTEM', content: 'Core system assets and media files for disconnected browsing.', timestamp: '2024-05-12', lastModified: 1715512800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-003', title: 'Field Operations Guide', category: 'MANUAL', content: 'Step-by-step procedures for manual network overrides.', timestamp: '2024-05-14', lastModified: 1715685600000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-004', title: 'Security Auth Keys', category: 'AUTH', content: 'Encrypted tokens required for offline device verification.', timestamp: '2024-05-15', lastModified: 1715772000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-005', title: 'Universal Map Data', category: 'GEO', content: 'High-resolution offline terrain mapping for global navigation.', timestamp: '2024-05-16', lastModified: 1715858400000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-006', title: 'Asset Ledger Alpha', category: 'LOGS', content: 'Unlimited growth capacity log for decentralized storage testing.', timestamp: '2024-05-17', lastModified: 1715944800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataList, setDataList] = useState<UserData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({ 
    name: 'Detecting...', 
    type: 'Unknown', 
    speed: '0 Mbps',
    effectiveType: '??'
  });
  
  const isCancelled = useRef(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        setNetworkInfo({
          name: conn.type === 'wifi' ? 'Home WiFi' : (conn.type === 'cellular' ? 'Cellular' : 'Direct Link'),
          type: conn.type?.toUpperCase() || 'NETWORK',
          speed: conn.downlink ? `${conn.downlink} Mbps` : '0 Mbps',
          effectiveType: conn.effectiveType?.toUpperCase() || 'N/A'
        });
      }
    };

    const handleOnline = () => { setIsOnline(true); updateNetworkInfo(); };
    const handleOffline = () => { 
      setIsOnline(false); 
      setNetworkInfo({ name: 'Offline', type: 'OFFLINE', speed: '0 Mbps', effectiveType: 'NONE' }); 
      if (syncing) stopDownload();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', updateNetworkInfo);

    updateNetworkInfo();
    
    const loadInitial = async () => {
      const local = await db.getAllOfflineData();
      if (local.length > 0) {
        // Merge local data with remote source to simulate "Unlimited" updates
        const merged = REMOTE_SOURCE.map(remote => {
          const foundLocal = local.find(l => l.id === remote.id);
          return foundLocal || remote;
        });
        setDataList(merged);
      } else {
        setDataList(REMOTE_SOURCE);
      }
    };
    loadInitial();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) conn.removeEventListener('change', updateNetworkInfo);
    };
  }, [syncing]);

  const handleDownload = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    isCancelled.current = false;

    // Create a copy to iterate
    const itemsToDownload = [...dataList];

    for (const item of itemsToDownload) {
      if (isCancelled.current) break;
      
      // Get fresh state for this specific item
      const currentItem = dataList.find(d => d.id === item.id);
      if (!currentItem || currentItem.status === SyncStatus.DOWNLOADED) continue;
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
      
      // Simulated granular download chunks
      for (let p = 5; p <= 100; p += 5) {
        if (isCancelled.current) break;
        await new Promise(r => setTimeout(r, 80)); 
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      if (!isCancelled.current) {
        const updatedItem = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
        await db.saveOfflineData(updatedItem);
        setDataList(prev => prev.map(d => d.id === item.id ? updatedItem : d));
      } else {
        // Handle the item being interrupted
        setDataList(prev => prev.map(d => d.id === item.id && d.status === SyncStatus.DOWNLOADING ? { ...d, status: SyncStatus.UNDOWNLOADED, progress: 0 } : d));
      }
    }
    
    setSyncing(false);
  }, [syncing, isOnline, dataList]);

  const stopDownload = () => {
    isCancelled.current = true;
    setSyncing(false);
    // Reset any items that were stuck in DOWNLOADING status to UNDOWNLOADED
    setDataList(prev => prev.map(d => 
      d.status === SyncStatus.DOWNLOADING 
        ? { ...d, status: SyncStatus.UNDOWNLOADED, progress: 0 } 
        : d
    ));
  };

  const toggleOfflineUsage = (active: boolean) => {
    setOfflineModeActive(active);
  };

  const handleShare = (title: string) => {
    if (window.confirm(`Share encrypted metadata for "${title}"?`)) {
      console.log(`Payload ready for sharing: ${title}`);
    }
  };

  const stats = useMemo(() => {
    const downloaded = dataList.filter(d => d.status === SyncStatus.DOWNLOADED);
    const inQueue = dataList.filter(d => d.status === SyncStatus.UNDOWNLOADED);
    const active = dataList.filter(d => d.status === SyncStatus.DOWNLOADING);
    return {
      downloaded,
      inQueue,
      active,
      totalMB: (downloaded.length * 24.5).toFixed(1)
    };
  }, [dataList]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit'] select-none">
      {/* Persistent Offline Mode Banner */}
      {offlineModeActive && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-[#d40511] z-[100] flex items-center justify-center gap-3 shadow-lg border-b border-black/20">
          <div className="w-2 h-2 rounded-full bg-white status-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Offline Local Mode Active</span>
        </div>
      )}

      <nav className={`fixed ${offlineModeActive ? 'top-8' : 'top-0'} left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-between px-8 lg:px-12 transition-all duration-300`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic shadow-[0_0_20px_rgba(212,5,17,0.3)]">OS</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {networkInfo.type === 'OFFLINE' ? 'SIGNAL INTERRUPTED' : `LINK: ${networkInfo.type}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-tight">{isOnline ? networkInfo.name : 'OFFLINE'}</span>
              <div className={`w-3 h-3 rounded-full border border-black/40 ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'} ${isOnline && 'status-pulse'}`} />
            </div>
          </div>
        </div>
      </nav>

      <div className={`pt-${offlineModeActive ? '36' : '28'} pb-12 px-8 lg:px-12 max-w-7xl mx-auto transition-all duration-300`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-zinc-900 p-8 border border-white/5 rounded-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="text-[8px] font-black bg-[#d40511]/10 text-[#d40511] px-2 py-0.5 rounded border border-[#d40511]/20 uppercase tracking-widest">Unlimited Vault</span>
              </div>

              <h3 className="text-xs font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Storage Core</h3>
              
              <div className="space-y-6">
                <div className="bg-black/40 p-5 rounded-sm border border-white/5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-zinc-500 text-[10px] font-black uppercase">Local Memory Used</span>
                    <span className="text-2xl font-black text-white">{stats.totalMB} MB</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-700 ease-in-out" 
                      style={{ width: stats.downloaded.length > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                  <div>
                    <p className="text-[9px] text-zinc-600 font-black uppercase">WiFi Link</p>
                    <p className="text-xs font-bold text-white truncate">{isOnline ? networkInfo.name : '---'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 font-black uppercase">Current Speed</p>
                    <p className="text-xs font-bold text-white">{isOnline ? networkInfo.speed : '0 Mbps'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {!syncing ? (
                    <CinematicButton 
                      onClick={handleDownload} 
                      label="Download All Data" 
                      className="w-full justify-center"
                      disabled={!isOnline || stats.inQueue.length === 0}
                      icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                    />
                  ) : (
                    <button 
                      onClick={stopDownload}
                      className="w-full py-4 bg-[#d40511] hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(212,5,17,0.4)] animate-pulse"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Stop Download
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => toggleOfflineUsage(true)}
                      disabled={stats.downloaded.length === 0}
                      className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${offlineModeActive ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/30'}`}
                    >
                      Connect
                    </button>
                    <button 
                      onClick={() => toggleOfflineUsage(false)}
                      className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${!offlineModeActive ? 'bg-zinc-800 border-zinc-800 text-zinc-500' : 'bg-transparent border-white/10 text-white hover:border-[#d40511]'}`}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-sm">
               <div className="flex justify-between items-center mb-4">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Network Transfer Queue</p>
                  <span className={`w-2 h-2 rounded-full ${syncing ? 'bg-[#d40511] status-pulse' : 'bg-zinc-800'}`} />
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-zinc-500 font-bold uppercase tracking-tighter">Remote Only</span>
                    <span className="bg-zinc-800 px-2 py-0.5 rounded font-black text-[10px]">{stats.inQueue.length}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-zinc-500 font-bold uppercase tracking-tighter">Active Stream</span>
                    <span className="text-[#d40511] font-black text-[10px]">{stats.active.length}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-zinc-500 font-bold uppercase tracking-tighter">Vault Secured</span>
                    <span className="text-emerald-500 font-black text-[10px]">{stats.downloaded.length}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-8 relative">
            {offlineModeActive && (
              <div className="absolute inset-0 pointer-events-none rounded-sm border border-emerald-500/10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_100%)] z-0" />
            )}

            {!offlineModeActive && isOnline ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-white/5 border-dashed rounded-sm bg-zinc-900/5">
                <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 shadow-xl">
                  <svg className="w-10 h-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.345 6.432c5.857-5.858 15.454-5.858 21.31 0" /></svg>
                </div>
                <h2 className="text-2xl font-black uppercase mb-4 tracking-tight">Active WiFi Link Established</h2>
                <p className="text-zinc-500 max-w-sm text-sm font-medium leading-relaxed">
                  Streaming data directly from authorized source. Use the "Download" command to commit data to local memory for disconnected access.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                <header className={`flex items-center justify-between p-8 border border-white/5 rounded-sm shadow-xl transition-all duration-500 ${offlineModeActive ? 'bg-[#050505]/95 border-emerald-500/20 shadow-emerald-900/10' : 'bg-zinc-900/60'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${offlineModeActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-[#d40511]'}`} />
                      <h2 className="text-3xl font-black uppercase tracking-tighter">
                        {offlineModeActive ? "Offline Local Memory" : "WiFi Data Stream"}
                      </h2>
                    </div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                      {offlineModeActive ? "Encrypted Local Node Running" : "Centralized Link Active"}
                    </p>
                  </div>
                  {offlineModeActive && (
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Vault Secure</span>
                        <span className="text-[10px] font-mono opacity-50 tracking-tighter">MODE: OFFLINE-SAFE</span>
                      </div>
                      <div className="w-12 h-12 rounded border border-emerald-500/20 flex items-center justify-center bg-emerald-500/5">
                        <svg className="w-6 h-6 text-emerald-500 status-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                    </div>
                  )}
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(offlineModeActive ? stats.downloaded : dataList).map(item => (
                    <DataCard 
                      key={item.id} 
                      data={item} 
                      onShare={() => handleShare(item.title)}
                    />
                  ))}
                  {(offlineModeActive && stats.downloaded.length === 0) && (
                    <div className="col-span-full py-40 text-center border border-white/5 border-dashed rounded-sm bg-black/20">
                      <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Local Memory Vault Empty</p>
                      <p className="text-zinc-500 text-[10px] mt-2 font-medium">Download data while online to enable offline access.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#d40511] py-3 px-8 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(212,5,17,0.4)]">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-white status-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Network Lost // Local Integrity Active</span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-tighter">DATA: DISCONNECTED</span>
        </div>
      )}
    </div>
  );
};

export default App;
