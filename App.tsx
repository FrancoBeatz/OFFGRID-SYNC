
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as dbService from './services/db';

const REMOTE_SOURCE: UserData[] = [
  { id: 'DATA-001', title: 'Network Config Pack', category: 'WIFI', content: 'Pre-cached local network settings for high-speed offline access.', timestamp: '2024-05-10', lastModified: 1715340000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-002', title: 'Offline Resource Bundle', category: 'SYSTEM', content: 'Core system assets and media files for disconnected browsing.', timestamp: '2024-05-12', lastModified: 1715512800000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-003', title: 'Field Operations Guide', category: 'MANUAL', content: 'Step-by-step procedures for manual network overrides.', timestamp: '2024-05-14', lastModified: 1715685600000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-004', title: 'Security Auth Keys', category: 'AUTH', content: 'Encrypted tokens required for offline device verification.', timestamp: '2024-05-15', lastModified: 1715772000000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
  { id: 'DATA-005', title: 'Universal Map Data', category: 'GEO', content: 'High-resolution offline terrain mapping for global navigation.', timestamp: '2024-05-16', lastModified: 1715858400000, status: SyncStatus.UNDOWNLOADED, progress: 0 },
];

const MB_PER_ITEM = 1250; // Each item is 1.25GB to demo the 10GB limit quickly
const MAX_MB = 10240; // 10GB

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataList, setDataList] = useState<UserData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [totalMB, setTotalMB] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'lastModified' | 'title'>('lastModified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [checkingSync, setCheckingSync] = useState(false);
  
  const isCancelled = useRef(false);

  // Sync Network Status
  useEffect(() => {
    const updateNetworkInfo = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
    };
  }, []);

  // Initial Data Load from IndexedDB
  const loadVault = useCallback(async () => {
    try {
      const local = await dbService.getAllOfflineData();
      let currentTotalMB = 0;
      const merged = REMOTE_SOURCE.map(remote => {
        const foundLocal = local.find(l => l.id === remote.id);
        if (foundLocal?.status === SyncStatus.DOWNLOADED) {
            currentTotalMB += MB_PER_ITEM;
        }
        return foundLocal ? { ...remote, ...foundLocal } : remote;
      });
      setDataList(merged);
      setTotalMB(currentTotalMB);
    } catch (err) {
      console.error("Failed to load vault:", err);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const startSync = useCallback(async () => {
    if (syncing || !isOnline || totalMB >= MAX_MB) return;
    
    setSyncing(true);
    isCancelled.current = false;

    const itemsToDownload = dataList.filter(d => d.status === SyncStatus.UNDOWNLOADED);

    for (const item of itemsToDownload) {
      if (isCancelled.current) break;
      if (totalMB + MB_PER_ITEM > MAX_MB) {
          alert("STORAGE PROTOCOL: 10GB Limit Reached. Purge cache to continue.");
          break;
      }
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
      
      // Simulated staggered download
      for (let p = 0; p <= 100; p += 20) {
        if (isCancelled.current) break;
        await new Promise(r => setTimeout(r, 150)); 
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      if (!isCancelled.current) {
        const updatedItem = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
        await dbService.saveOfflineData(updatedItem);
        setDataList(prev => prev.map(d => d.id === item.id ? updatedItem : d));
        setTotalMB(prev => prev + MB_PER_ITEM);
      }
    }
    
    setSyncing(false);
  }, [syncing, isOnline, dataList, totalMB]);

  const stopSync = () => {
    isCancelled.current = true;
    setSyncing(false);
    setDataList(prev => prev.map(d => 
      d.status === SyncStatus.DOWNLOADING ? { ...d, status: SyncStatus.UNDOWNLOADED, progress: 0 } : d
    ));
  };

  const purgeCache = async () => {
      if (window.confirm("WIPE LOCAL VAULT? This action cannot be undone.")) {
          await dbService.clearLocalVault();
          setTotalMB(0);
          setOfflineModeActive(false);
          loadVault();
      }
  };

  const displayData = useMemo(() => {
    let result = [...dataList];
    
    // Isolation Protocol: Filter out undownloaded data if Go Live is active
    if (offlineModeActive) {
      result = result.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC);
    }
    
    if (filterCategory !== 'ALL') {
      result = result.filter(d => d.category === filterCategory);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      let comparison = sortBy === 'title' ? a.title.localeCompare(b.title) : (a.lastModified || 0) - (b.lastModified || 0);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [dataList, offlineModeActive, filterCategory, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const downloaded = dataList.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC);
    return {
      count: downloaded.length,
      mb: Math.min(totalMB, MAX_MB),
      percent: Math.min((totalMB / MAX_MB) * 100, 100).toFixed(1)
    };
  }, [dataList, totalMB]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-red-600">
      {/* Isolation Protocol Header */}
      {offlineModeActive && (
        <div className="fixed top-0 left-0 right-0 h-10 bg-[#d40511] z-[100] flex items-center justify-center gap-3 shadow-2xl border-b border-white/20">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">Isolation Protocol Active: Local Secure Cache Only</span>
        </div>
      )}

      <nav className={`fixed ${offlineModeActive ? 'top-10' : 'top-0'} left-0 right-0 h-20 bg-black/90 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-between px-12 transition-all duration-500`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic shadow-lg">OS</div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{isOnline ? 'LINK STABLE' : 'LINK SEVERED'}</span>
            <span className="text-xs font-bold text-zinc-300">{isOnline ? 'Network Hub' : 'Offline Node'}</span>
          </div>
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-600 shadow-[0_0_10px_#d40511]'}`} />
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Sidebar: Control Deck */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900/80 p-8 border border-white/5 rounded-sm relative overflow-hidden backdrop-blur-sm">
            <h3 className="text-[10px] font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Storage Dynamics</h3>
            
            <div className="space-y-6">
              <div className="bg-black/40 p-5 border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-zinc-500 text-[10px] font-black uppercase">Buffered</span>
                  <span className="text-2xl font-black">{stats.mb.toLocaleString()} MB</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full bg-emerald-500 transition-all duration-700 progress-stripe ${syncing ? 'opacity-100' : 'opacity-40'}`} 
                    style={{ width: `${stats.percent}%` }} 
                  />
                </div>
                <div className="flex justify-between mt-2">
                   <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">10GB Capacity</p>
                   <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{stats.percent}% Loaded</p>
                </div>
              </div>

              <div className="space-y-3">
                {!syncing ? (
                  <CinematicButton 
                    onClick={startSync} 
                    label="Initialize Sync" 
                    className="w-full justify-center"
                    disabled={!isOnline || stats.mb >= MAX_MB}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                  />
                ) : (
                  <button 
                    onClick={stopSync} 
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 border border-red-500/30 animate-pulse transition-all"
                  >
                    Abort Stream
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setOfflineModeActive(true)}
                    disabled={stats.count === 0}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${offlineModeActive ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}
                  >
                    Go Live
                  </button>
                  <button 
                    onClick={() => setOfflineModeActive(false)}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${!offlineModeActive ? 'bg-white border-white text-black' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20'}`}
                  >
                    Standby
                  </button>
                </div>
                
                <button 
                    onClick={purgeCache}
                    className="w-full py-3 text-[10px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-[0.3em] transition-colors"
                >
                    Wipe Local Vault
                </button>
              </div>
            </div>
          </section>

          <div className="p-6 bg-zinc-900/20 border border-white/5 text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-loose">
             <p>System v4.0.1</p>
             <p>Protocol: AES-256 Local Sharding</p>
             <p>Status: {offlineModeActive ? 'ISOLATED' : 'NETWORK_READY'}</p>
          </div>
        </aside>

        {/* Main Feed: Tactical Records */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-wrap items-center gap-4 bg-zinc-900/40 p-4 border border-white/5">
            <div className="flex-1 min-w-[200px] relative">
              <input 
                type="text" 
                placeholder="Scan Registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] focus:border-[#d40511] outline-none transition-all placeholder:text-zinc-800"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-black border border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#d40511] cursor-pointer"
            >
              <option value="ALL">Sources: All</option>
              <option value="WIFI">Category: WiFi</option>
              <option value="SYSTEM">Category: System</option>
              <option value="MANUAL">Category: Field Guide</option>
              <option value="AUTH">Category: Security</option>
              <option value="GEO">Category: Mapping</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayData.map(item => (
              <DataCard key={item.id} data={item} />
            ))}
          </div>
          
          {displayData.length === 0 && (
            <div className="py-32 text-center border border-dashed border-white/5 bg-white/5 rounded-sm">
              <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-xs">No Records Found in Current Buffer</p>
            </div>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-[#d40511] transition-all duration-300 shadow-[0_0_10px_#d40511]" 
          style={{ width: syncing ? '100%' : '0%' }}
        />
      </footer>
    </div>
  );
};

export default App;
