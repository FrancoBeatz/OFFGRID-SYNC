
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as db from './services/db';

const REMOTE_SOURCE: UserData[] = [
  { id: 'DATA-001', title: 'Network Config Pack', category: 'WIFI', content: 'Pre-cached local network settings for high-speed offline access.', timestamp: '2024-05-10', lastModified: 1715340000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-002', title: 'Offline Resource Bundle', category: 'SYSTEM', content: 'Core system assets and media files for disconnected browsing.', timestamp: '2024-05-12', lastModified: 1715512800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-003', title: 'Field Operations Guide', category: 'MANUAL', content: 'Step-by-step procedures for manual network overrides.', timestamp: '2024-05-14', lastModified: 1715685600000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-004', title: 'Security Auth Keys', category: 'AUTH', content: 'Encrypted tokens required for offline device verification.', timestamp: '2024-05-15', lastModified: 1715772000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dataList, setDataList] = useState<UserData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{name: string, speed: string}>({ name: 'Searching...', speed: '0 Mbps' });

  // Monitor Network Speed and Name
  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        // We simulate SSID name because browser API restricts actual SSID for privacy, 
        // but we show the connection type clearly.
        setNetworkInfo({
          name: conn.type === 'wifi' ? 'Home WiFi' : (conn.effectiveType?.toUpperCase() || 'Local Network'),
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
      setNetworkInfo({ name: 'No WiFi', speed: '0 Mbps' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', updateNetworkInfo);

    updateNetworkInfo();
    
    const loadInitial = async () => {
      const local = await db.getAllOfflineData();
      if (local.length > 0) {
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

  const handleDownload = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    for (const item of dataList) {
      if (item.status === SyncStatus.DOWNLOADED) continue;
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 10 } : d));
      
      for (let p = 20; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 150));
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      const updated = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
      await db.saveOfflineData(updated);
      setDataList(prev => prev.map(d => d.id === item.id ? updated : d));
    }
    setSyncing(false);
  }, [syncing, isOnline, dataList]);

  const toggleOfflineUsage = (active: boolean) => {
    if (active) {
      setIsAuthorized(true);
      setOfflineModeActive(true);
    } else {
      setOfflineModeActive(false);
    }
  };

  const categorizedData = useMemo(() => ({
    undownloaded: dataList.filter(d => d.status === SyncStatus.UNDOWNLOADED),
    downloading: dataList.filter(d => d.status === SyncStatus.DOWNLOADING),
    downloaded: dataList.filter(d => d.status === SyncStatus.DOWNLOADED)
  }), [dataList]);

  // Calculate "MB" downloaded (simulated based on item count)
  const downloadedMB = useMemo(() => (categorizedData.downloaded.length * 12.4).toFixed(1), [categorizedData.downloaded]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit']">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic">OS</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">WIFI SIGNAL</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{networkInfo.name}</span>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-12 px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Device Storage & Network HUD */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-zinc-900 p-8 border border-white/5 rounded-sm shadow-2xl">
              <h3 className="text-xs font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Device Storage</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-zinc-500 text-[10px] font-black uppercase">WiFi Data Saved</span>
                    <span className="text-2xl font-black text-white">{downloadedMB} MB</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#d40511] transition-all duration-1000" 
                      style={{ width: `${(categorizedData.downloaded.length / dataList.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                  <div>
                    <p className="text-[9px] text-zinc-600 font-black uppercase">Network</p>
                    <p className="text-xs font-bold text-white truncate">{networkInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 font-black uppercase">Speed</p>
                    <p className="text-xs font-bold text-white">{networkInfo.speed}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <CinematicButton 
                    onClick={handleDownload} 
                    label="Download Data" 
                    className="w-full justify-center"
                    disabled={syncing || !isOnline || categorizedData.undownloaded.length === 0}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => toggleOfflineUsage(true)}
                      disabled={categorizedData.downloaded.length === 0}
                      className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest border transition-all ${offlineModeActive ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/30'}`}
                    >
                      Connect
                    </button>
                    <button 
                      onClick={() => toggleOfflineUsage(false)}
                      className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest border transition-all ${!offlineModeActive ? 'bg-zinc-800 border-zinc-800 text-zinc-500' : 'bg-transparent border-white/10 text-white hover:border-[#d40511]'}`}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="p-6 bg-zinc-900/40 border border-white/5">
               <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Status Tracking</p>
               <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Not Downloaded</span>
                    <span className="font-bold">{categorizedData.undownloaded.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Downloading</span>
                    <span className="font-bold text-[#d40511]">{categorizedData.downloading.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Downloaded</span>
                    <span className="font-bold text-emerald-500">{categorizedData.downloaded.length}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Main Data View */}
          <div className="lg:col-span-8">
            {!offlineModeActive && isOnline ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-white/5 border-dashed rounded-sm bg-zinc-900/20">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.345 6.432c5.857-5.858 15.454-5.858 21.31 0" /></svg>
                </div>
                <h2 className="text-2xl font-black uppercase mb-4 tracking-tight">Cloud Link Active</h2>
                <p className="text-zinc-500 max-w-sm text-sm">Download your WiFi data on the left to prepare for offline use. Tap "Connect" to start using your downloaded data.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">
                      {offlineModeActive ? "Offline WiFi Data" : "Previewing Data"}
                    </h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                      {offlineModeActive ? "Running from local memory" : "Connected to live cloud"}
                    </p>
                  </div>
                  {offlineModeActive && (
                    <div className="px-4 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase rounded-full">
                      Safe to use offline
                    </div>
                  )}
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(offlineModeActive ? categorizedData.downloaded : dataList).map(item => (
                    <DataCard key={item.id} data={item} />
                  ))}
                  {(offlineModeActive && categorizedData.downloaded.length === 0) && (
                    <div className="col-span-full py-32 text-center border border-white/5 bg-zinc-900/20">
                      <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No data has been downloaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#d40511] py-2 px-8 flex justify-between items-center z-50">
          <span className="text-[10px] font-black uppercase tracking-[0.5em]">WiFi Link Severed // Local Memory Only</span>
          <span className="text-[10px] font-mono opacity-50">EST. SPEED: 0.0 MBPS</span>
        </div>
      )}
    </div>
  );
};

export default App;
