
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as db from './services/db';

const REMOTE_SOURCE: UserData[] = [
  { id: 'OS-001', title: 'Global Logistics Protocol', category: 'SECURITY', content: 'Standard encryption keys and routing tables for sub-zero environments.', timestamp: '2024-05-10', lastModified: 1715340000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-002', title: 'Terminal Access Matrix', category: 'NETWORK', content: 'Local node mapping for isolated grid infrastructures.', timestamp: '2024-05-12', lastModified: 1715512800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-003', title: 'Operational Field Manual', category: 'MANUAL', content: 'Step-by-step procedures for hardware maintenance without cloud parity.', timestamp: '2024-05-14', lastModified: 1715685600000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-004', title: 'Emergency Resync Patch', category: 'SYSTEM', content: 'Critical binary delta for synchronizing state after prolonged outage.', timestamp: '2024-05-15', lastModified: 1715772000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'OS-005', title: 'Deep Sea Relay Keys', category: 'COMMS', content: 'Sub-aquatic communication tokens for tethered data transfer.', timestamp: '2024-05-16', lastModified: 1715858400000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dataList, setDataList] = useState<UserData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{name: string, speed: string}>({ name: 'Checking...', speed: '0 Mbps' });

  // Monitor Network Speed and Name
  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        setNetworkInfo({
          name: conn.type === 'wifi' ? 'WiFi Connected' : (conn.effectiveType?.toUpperCase() || 'Network Active'),
          speed: conn.downlink ? `${conn.downlink} Mbps` : 'Detecting...'
        });
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateNetworkInfo();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkInfo({ name: 'Offline', speed: '0 Mbps' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', updateNetworkInfo);

    updateNetworkInfo();
    
    const loadInitial = async () => {
      const local = await db.getAllOfflineData();
      if (local.length > 0) {
        setIsAuthorized(true);
        setDataList(local);
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
  }, []);

  const handleConnect = useCallback(() => {
    setSyncing(true);
    setTimeout(() => {
      setIsAuthorized(true);
      setSyncing(false);
    }, 1200);
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (confirm("Delete saved files and sign out?")) {
      await db.clearLocalData();
      setDataList(REMOTE_SOURCE);
      setIsAuthorized(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!isAuthorized || syncing || !isOnline) return;
    setSyncing(true);
    for (const item of dataList) {
      if (item.status === SyncStatus.DOWNLOADED) continue;
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 10 } : d));
      
      for (let p = 20; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 200));
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      const updated = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
      await db.saveOfflineData(updated);
      setDataList(prev => prev.map(d => d.id === item.id ? updated : d));
    }
    setSyncing(false);
  }, [isAuthorized, syncing, isOnline, dataList]);

  const categorizedData = useMemo(() => ({
    undownloaded: dataList.filter(d => d.status === SyncStatus.UNDOWNLOADED),
    downloading: dataList.filter(d => d.status === SyncStatus.DOWNLOADING),
    downloaded: dataList.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC)
  }), [dataList]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit']">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic">OS</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Offgrid <span className="text-[#d40511] not-italic">Sync</span></h1>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{networkInfo.name}</span>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
            </div>
            <span className="text-xs font-mono text-white/60">{networkInfo.speed}</span>
          </div>
          
          {isAuthorized ? (
            <button onClick={handleDisconnect} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#d40511] transition-colors">Sign Out</button>
          ) : (
            <CinematicButton onClick={handleConnect} label="Sign In" className="py-2" disabled={!isOnline} />
          )}
        </div>
      </nav>

      <div className="pt-28 pb-12 px-8 lg:px-12 max-w-7xl mx-auto">
        {!isAuthorized ? (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <h2 className="text-6xl font-black tracking-tighter mb-6 uppercase">Save your files.<br/>Work anywhere.</h2>
            <p className="text-zinc-500 max-w-lg mb-12">Sign in to download your files so you can keep working even when you don't have WiFi.</p>
            <CinematicButton onClick={handleConnect} label="Connect Now" disabled={!isOnline} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-8">
              <section className="bg-zinc-900/40 p-8 border border-white/5 rounded-sm">
                <h3 className="text-xs font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Device Storage</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-500 text-xs font-bold uppercase">Files Saved</span>
                    <span className="text-3xl font-black">{categorizedData.downloaded.length} / {dataList.length}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#d40511] transition-all duration-1000 shadow-[0_0_15px_rgba(212,5,17,0.5)]" 
                      style={{ width: `${(categorizedData.downloaded.length / dataList.length) * 100}%` }}
                    />
                  </div>
                  <CinematicButton 
                    onClick={handleDownload} 
                    label={syncing ? "Downloading..." : "Download Data"} 
                    className="w-full justify-center mt-6"
                    disabled={syncing || !isOnline || categorizedData.undownloaded.length === 0}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                  />
                </div>
              </section>

              <section className="bg-zinc-900/20 p-8 border border-white/5 border-dashed rounded-sm">
                <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Quick Tip</h3>
                <p className="text-zinc-500 text-sm leading-relaxed italic">
                  "Once your files turn red, they are saved on your device. You can turn off your WiFi and keep reading."
                </p>
              </section>
            </div>

            {/* Content Display */}
            <div className="lg:col-span-8 space-y-12">
              {/* Active/Offline Section */}
              {!isOnline && categorizedData.downloaded.length > 0 && (
                <div className="p-6 bg-[#d40511]/10 border border-[#d40511]/30 rounded-sm mb-8">
                  <div className="flex items-center gap-3 text-[#d40511] mb-2">
                    <div className="w-2 h-2 rounded-full bg-current status-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Offline Workspace Active</span>
                  </div>
                  <p className="text-sm text-white/80">You are offline. You can only see the files you saved before.</p>
                </div>
              )}

              {/* Status Groups */}
              {categorizedData.downloading.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Downloading Now</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {categorizedData.downloading.map(item => <DataCard key={item.id} data={item} />)}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Your Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Show all when online, only downloaded when offline */}
                  {(isOnline ? dataList : categorizedData.downloaded).map(item => (
                    <DataCard key={item.id} data={item} />
                  ))}
                  {(!isOnline && categorizedData.downloaded.length === 0) && (
                    <div className="col-span-full py-20 text-center border border-white/5 rounded-sm bg-zinc-900/10">
                      <p className="text-zinc-600 font-bold">No files were saved for offline use.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connectivity Alert */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#d40511] py-2 px-8 flex justify-between items-center z-50">
          <span className="text-[10px] font-black uppercase tracking-[0.5em]">Network Lost // Local Archive Access Only</span>
          <span className="text-[10px] font-mono opacity-50">v1.2.4-LOCAL</span>
        </div>
      )}
    </div>
  );
};

export default App;
