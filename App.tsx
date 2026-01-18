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
];

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
  
  const [networkInfo, setNetworkInfo] = useState({ 
    name: 'Detecting...', 
    type: 'Unknown', 
    speed: '0 Mbps'
  });
  
  const isCancelled = useRef(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setNetworkInfo({
          name: conn.type === 'wifi' ? 'Home WiFi' : 'Cellular Connection',
          type: conn.type?.toUpperCase() || 'NET',
          speed: conn.downlink ? `${conn.downlink} Mbps` : 'Direct Link'
        });
      }
    };

    window.addEventListener('online', () => { setIsOnline(true); updateNetworkInfo(); });
    window.addEventListener('offline', () => { setIsOnline(false); if (syncing) stopDownload(); });
    
    updateNetworkInfo();
    
    const loadInitial = async () => {
      const local = await db.getAllOfflineData();
      let currentTotal = 0;
      const merged = REMOTE_SOURCE.map(remote => {
        const foundLocal = local.find(l => l.id === remote.id);
        if (foundLocal?.status === SyncStatus.DOWNLOADED) currentTotal += 24.5;
        return foundLocal || remote;
      });
      setDataList(merged);
      setTotalMB(currentTotal);
    };
    loadInitial();
  }, [syncing]);

  const handleDownload = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    isCancelled.current = false;

    // Sync defined items
    for (const item of dataList) {
      if (isCancelled.current) break;
      if (item.status === SyncStatus.DOWNLOADED || item.status === SyncStatus.OUT_OF_SYNC) continue;
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
      
      for (let p = 10; p <= 100; p += 10) {
        if (isCancelled.current) break;
        await new Promise(r => setTimeout(r, 80)); 
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      if (!isCancelled.current) {
        const updatedItem = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
        await db.saveOfflineData(updatedItem);
        setDataList(prev => prev.map(d => d.id === item.id ? updatedItem : d));
        setTotalMB(prev => prev + 24.5);
      }
    }

    // Unlimited background stream up to 10GB
    while (!isCancelled.current && isOnline && totalMB < 10000) {
      await new Promise(r => setTimeout(r, 200));
      const chunk = 5 + Math.random() * 15;
      setTotalMB(prev => {
          const next = Math.min(prev + chunk, 10000);
          return next;
      });
      if (totalMB >= 10000) break;
    }
    
    setSyncing(false);
  }, [syncing, isOnline, dataList, totalMB]);

  const stopDownload = () => {
    isCancelled.current = true;
    setSyncing(false);
    setDataList(prev => prev.map(d => 
      d.status === SyncStatus.DOWNLOADING ? { ...d, status: SyncStatus.UNDOWNLOADED, progress: 0 } : d
    ));
  };

  const manualSync = async () => {
    setCheckingSync(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setDataList(prev => prev.map(item => {
        // Simulate a remote update for one item
        if (item.id === 'DATA-002' && item.status === SyncStatus.DOWNLOADED) {
            return { ...item, status: SyncStatus.OUT_OF_SYNC };
        }
        return item;
    }));
    setCheckingSync(false);
  };

  const resolveConflict = async (id: string, choice: 'local' | 'remote') => {
      const item = dataList.find(d => d.id === id);
      if (!item) return;

      if (choice === 'local') {
          const updated = { ...item, status: SyncStatus.DOWNLOADED, lastModified: Date.now() };
          await db.saveOfflineData(updated);
          setDataList(prev => prev.map(d => d.id === id ? updated : d));
      } else {
          // Re-downloading remote version
          setDataList(prev => prev.map(d => d.id === id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
          for (let p = 0; p <= 100; p += 20) {
              await new Promise(r => setTimeout(r, 100));
              setDataList(prev => prev.map(d => d.id === id ? { ...d, progress: p } : d));
          }
          const updated = { ...item, status: SyncStatus.DOWNLOADED, lastModified: Date.now() };
          await db.saveOfflineData(updated);
          setDataList(prev => prev.map(d => d.id === id ? updated : d));
      }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...dataList];
    
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
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else {
        comparison = (a.lastModified || 0) - (b.lastModified || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [dataList, offlineModeActive, filterCategory, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const downloaded = dataList.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC);
    const mb = Math.min(totalMB, 10000);
    return {
      downloadedCount: downloaded.length,
      needsSync: dataList.some(d => d.status === SyncStatus.OUT_OF_SYNC),
      totalMB: mb,
      percent: (mb / 10000 * 100).toFixed(1)
    };
  }, [dataList, totalMB]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit']">
      {offlineModeActive && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-[#d40511] z-[100] flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Vault Protocol: Local Mode</span>
        </div>
      )}

      <nav className={`fixed ${offlineModeActive ? 'top-8' : 'top-0'} left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-between px-12 transition-all`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic shadow-[0_0_20px_rgba(212,5,17,0.3)]">OS</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{isOnline ? 'LIVE LINK' : 'LINK LOST'}</span>
            <span className="text-sm font-bold">{isOnline ? networkInfo.name : 'OFFLINE'}</span>
          </div>
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
        </div>
      </nav>

      <main className="pt-32 pb-12 px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 p-8 border border-white/5 rounded-sm relative">
            <h3 className="text-xs font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Storage Engine</h3>
            
            <div className="space-y-6">
              <div className="bg-black/40 p-5 rounded-sm border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-zinc-500 text-[10px] font-black uppercase">Local Memory</span>
                  <span className="text-2xl font-black">{stats.totalMB.toFixed(1)} MB</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div className={`h-full bg-emerald-500 transition-all duration-500 progress-stripe ${syncing ? 'opacity-100' : 'opacity-50'}`} style={{ width: `${stats.percent}%` }} />
                </div>
                <p className="text-[8px] mt-2 text-zinc-600 font-bold uppercase tracking-widest text-right">Target: 10,000 MB</p>
              </div>

              <div className="space-y-3">
                {!syncing ? (
                  <CinematicButton 
                    onClick={handleDownload} 
                    label="Sync Unlimited" 
                    className="w-full justify-center"
                    disabled={!isOnline || stats.totalMB >= 10000}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                  />
                ) : (
                  <button onClick={stopDownload} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 border border-red-500/20 red-glow">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>
                    Kill Sync Process
                  </button>
                )}

                <button 
                    onClick={manualSync}
                    disabled={!isOnline || checkingSync}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all border border-white/5 disabled:opacity-30"
                >
                    <svg className={`w-4 h-4 ${checkingSync ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {checkingSync ? 'Comparing...' : 'Manual Sync'}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setOfflineModeActive(true)}
                    disabled={stats.downloadedCount === 0}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${offlineModeActive ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_#10b981]' : 'bg-transparent border-white/10 text-zinc-500'}`}
                  >
                    Use Local
                  </button>
                  <button 
                    onClick={() => setOfflineModeActive(false)}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all ${!offlineModeActive ? 'bg-white border-white text-black' : 'bg-transparent border-white/10 text-zinc-400'}`}
                  >
                    Go Live
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-sm">
             <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Vault Integrity</p>
             <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-zinc-500">Status</span>
                  <span className={stats.needsSync ? 'text-orange-500' : 'text-emerald-500'}>
                      {stats.needsSync ? 'Out of Sync' : 'Fully Secured'}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-zinc-500">Cached Items</span>
                  <span className="text-white">{stats.downloadedCount}</span>
                </div>
             </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <input 
                type="text" 
                placeholder="Search Vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/10 px-10 py-2.5 text-xs font-bold uppercase tracking-widest focus:border-[#d40511] outline-none transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-black/50 border border-white/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#d40511]"
            >
              <option value="ALL">All Categories</option>
              <option value="WIFI">WiFi</option>
              <option value="SYSTEM">System</option>
              <option value="MANUAL">Manual</option>
              <option value="AUTH">Auth</option>
              <option value="GEO">Geo</option>
            </select>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
               <button 
                onClick={() => setSortBy(prev => prev === 'title' ? 'lastModified' : 'title')}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-zinc-800 transition-all"
               >
                 {sortBy === 'title' ? 'Alpha' : 'Date'}
               </button>
               <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-white/5 hover:bg-zinc-800 transition-all"
               >
                 <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedData.map(item => (
              <DataCard 
                key={item.id} 
                data={item} 
                onResolveConflict={(choice) => resolveConflict(item.id, choice)}
              />
            ))}
          </div>
          
          {filteredAndSortedData.length === 0 && (
            <div className="py-20 text-center border border-white/5 border-dashed rounded-sm bg-zinc-900/20">
              <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">No records found matching criteria</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
