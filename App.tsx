
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import * as dbService from './services/db';
import { fetchRemoteData } from './services/api';

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
      setIsOnline(navigator.onLine);
      if (conn) {
        setNetworkInfo({
          name: conn.type === 'wifi' ? 'Home WiFi' : 'Cellular Connection',
          type: conn.type?.toUpperCase() || 'NET',
          speed: conn.downlink ? `${conn.downlink} Mbps` : 'Direct Link'
        });
      }
    };
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    updateNetworkInfo();
    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
    };
  }, []);

  const loadVault = useCallback(async () => {
    try {
      const remoteSource = await fetchRemoteData();
      const local = await dbService.getAllOfflineData();
      let currentTotal = 0;
      
      const merged = remoteSource.map(remote => {
        const foundLocal = local.find(l => l.id === remote.id);
        if (foundLocal?.status === SyncStatus.DOWNLOADED) {
            currentTotal += 24.5;
            // Check for conflict
            if (remote.lastModified > (foundLocal.lastModified || 0)) {
                return { ...foundLocal, status: SyncStatus.OUT_OF_SYNC };
            }
        }
        return foundLocal ? { ...remote, ...foundLocal } : remote;
      });
      
      setDataList(merged);
      setTotalMB(currentTotal);
    } catch (err) {
      console.error("Failed to load vault:", err);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault, isOnline]);

  const handleDownload = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    isCancelled.current = false;

    for (const item of dataList) {
      if (isCancelled.current) break;
      if (item.status === SyncStatus.DOWNLOADED || item.status === SyncStatus.OUT_OF_SYNC) continue;
      
      setDataList(prev => prev.map(d => d.id === item.id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
      
      for (let p = 0; p <= 100; p += 10) {
        if (isCancelled.current) break;
        await new Promise(r => setTimeout(r, 100)); 
        setDataList(prev => prev.map(d => d.id === item.id ? { ...d, progress: p } : d));
      }

      if (!isCancelled.current) {
        const updatedItem = { ...item, status: SyncStatus.DOWNLOADED, progress: 100, lastModified: Date.now() };
        await dbService.saveOfflineData(updatedItem);
        setDataList(prev => prev.map(d => d.id === item.id ? updatedItem : d));
        setTotalMB(prev => prev + 24.5);
      }
    }

    while (!isCancelled.current && isOnline && totalMB < 10000) {
      await new Promise(r => setTimeout(r, 200));
      const chunk = 10 + Math.random() * 20;
      setTotalMB(prev => Math.min(prev + chunk, 10000));
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
    if (!isOnline) return;
    setCheckingSync(true);
    await loadVault();
    setCheckingSync(false);
  };

  const resolveConflict = async (id: string, choice: 'local' | 'remote') => {
      const item = dataList.find(d => d.id === id);
      if (!item) return;

      if (choice === 'local') {
          const updated = { ...item, status: SyncStatus.DOWNLOADED, lastModified: Date.now() };
          await dbService.saveOfflineData(updated);
          setDataList(prev => prev.map(d => d.id === id ? updated : d));
      } else {
          setDataList(prev => prev.map(d => d.id === id ? { ...d, status: SyncStatus.DOWNLOADING, progress: 0 } : d));
          for (let p = 0; p <= 100; p += 20) {
              await new Promise(r => setTimeout(r, 80));
              setDataList(prev => prev.map(d => d.id === id ? { ...d, progress: p } : d));
          }
          const updated = { ...item, status: SyncStatus.DOWNLOADED, lastModified: Date.now(), progress: 100 };
          await dbService.saveOfflineData(updated);
          setDataList(prev => prev.map(d => d.id === id ? updated : d));
      }
  };

  const displayData = useMemo(() => {
    let result = [...dataList];
    if (offlineModeActive) result = result.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC);
    if (filterCategory !== 'ALL') result = result.filter(d => d.category === filterCategory);
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
    const mb = Math.min(totalMB, 10000);
    return {
      downloadedCount: downloaded.length,
      needsSync: dataList.some(d => d.status === SyncStatus.OUT_OF_SYNC),
      totalMB: mb,
      percent: (mb / 10000 * 100).toFixed(1)
    };
  }, [dataList, totalMB]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit'] selection:bg-red-600">
      {offlineModeActive && (
        <div className="fixed top-0 left-0 right-0 h-8 bg-[#d40511] z-[100] flex items-center justify-center gap-3 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Vault Protocol: Local Cache Enabled</span>
        </div>
      )}

      <nav className={`fixed ${offlineModeActive ? 'top-8' : 'top-0'} left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-between px-12 transition-all duration-300`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic shadow-[0_0_20px_rgba(212,5,17,0.3)] select-none">OS</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic hidden md:block">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{isOnline ? 'SIGNAL STABLE' : 'SIGNAL LOST'}</span>
            <span className="text-sm font-bold text-zinc-200">{isOnline ? networkInfo.name : 'OFFLINE MODE'}</span>
          </div>
          <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-600 shadow-[0_0_10px_#d40511]'}`} />
        </div>
      </nav>

      <main className="pt-32 pb-12 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 transition-all">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 p-8 border border-white/5 rounded-sm relative overflow-hidden">
            <h3 className="text-xs font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Storage Core</h3>
            <div className="space-y-6">
              <div className="bg-black/40 p-5 rounded-sm border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-zinc-500 text-[10px] font-black uppercase">Local Cache Used</span>
                  <span className="text-2xl font-black">{stats.totalMB.toLocaleString(undefined, { maximumFractionDigits: 1 })} MB</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div className={`h-full bg-emerald-500 transition-all duration-700 progress-stripe ${syncing ? 'opacity-100' : 'opacity-40'}`} style={{ width: `${stats.percent}%` }} />
                </div>
                <div className="flex justify-between mt-2">
                   <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">10 GB Capacity</p>
                   <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{stats.percent}% Loaded</p>
                </div>
              </div>
              <div className="space-y-3">
                {!syncing ? (
                  <CinematicButton onClick={handleDownload} label="Initialize Sync" className="w-full justify-center" disabled={!isOnline || stats.totalMB >= 10000} />
                ) : (
                  <button onClick={stopDownload} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 border border-red-500/20 animate-pulse transition-all">
                    Abort Sync
                  </button>
                )}
                <button onClick={manualSync} disabled={!isOnline || checkingSync} className="w-full py-3 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-20">
                    {checkingSync ? 'Detecting Delta...' : 'Manual Sync Check'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setOfflineModeActive(true)} disabled={stats.downloadedCount === 0} className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${offlineModeActive ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_#10b981]' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}>Use Local</button>
                  <button onClick={() => setOfflineModeActive(false)} className={`py-4 text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${!offlineModeActive ? 'bg-white border-white text-black' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20'}`}>Go Live</button>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <input type="text" placeholder="Query Registry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/50 border border-white/10 px-10 py-2.5 text-xs font-bold uppercase tracking-widest focus:border-[#d40511] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayData.map(item => (
              <DataCard key={item.id} data={item} onResolveConflict={(choice) => resolveConflict(item.id, choice)} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
