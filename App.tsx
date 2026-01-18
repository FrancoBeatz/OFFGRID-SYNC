
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SyncStatus, UserData } from './types';
import CinematicButton from './components/CinematicButton';
import DataCard from './components/DataCard';
import AuthModal from './components/AuthModal';
import * as dbService from './services/db';
import { fetchRemoteData } from './services/api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('os_token'));
  const [user, setUser] = useState<any>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataList, setDataList] = useState<UserData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<string>('');
  
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [totalMB, setTotalMB] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedUser = localStorage.getItem('os_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('os_token');
    localStorage.removeItem('os_user');
    setToken(null);
    setUser(null);
    setDataList([]);
    setTotalMB(0);
  };

  const loadVault = useCallback(async () => {
    if (!token || !user) return;
    try {
      setSyncPhase('Verifying Identity...');
      const remoteSource = await fetchRemoteData();
      const local = await dbService.getAllOfflineData();
      
      // Filter local data to only show what belongs to the current user
      const userLocal = local.filter(l => l.userId === user.id);
      
      let currentTotal = 0;
      
      const merged = remoteSource.map(remote => {
        const foundLocal = userLocal.find(l => l.id === remote.id);
        if (foundLocal?.status === SyncStatus.DOWNLOADED) {
            currentTotal += 24.5;
            if (remote.lastModified > (foundLocal.lastModified || 0)) {
                return { ...foundLocal, status: SyncStatus.OUT_OF_SYNC };
            }
        }
        return foundLocal ? { ...remote, ...foundLocal } : { ...remote, status: SyncStatus.UNDOWNLOADED, userId: user.id };
      });
      
      setDataList(merged);
      setTotalMB(currentTotal);
      setSyncPhase('Registry Linked');
      setTimeout(() => setSyncPhase(''), 2000);
    } catch (err) {
      setSyncPhase('Running Offline Buffer');
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      loadVault();
    }
  }, [loadVault, isOnline, token, user]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAction = async (action: 'secure' | 'delete') => {
    if (!user) return;
    setSyncing(true);
    const targets = dataList.filter(d => selectedIds.has(d.id));
    
    for (const item of targets) {
      if (action === 'secure') {
        setSyncPhase(`Encrypting ${item.id}...`);
        const updated = { 
          ...item, 
          userId: user.id,
          status: SyncStatus.DOWNLOADED, 
          progress: 100, 
          lastModified: Date.now() 
        };
        await dbService.saveOfflineData(updated);
        setDataList(prev => prev.map(d => d.id === item.id ? updated : d));
        setTotalMB(p => p + 24.5);
      } else {
        setSyncPhase(`Wiping ${item.id}...`);
        await dbService.deleteOfflineData(item.id);
        setDataList(prev => prev.map(d => d.id === item.id ? { ...item, status: SyncStatus.UNDOWNLOADED, progress: 0 } : d));
        setTotalMB(p => Math.max(0, p - 24.5));
      }
    }
    
    setSyncing(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSyncPhase(action === 'secure' ? 'Secure Buffer Complete' : 'Protocol: Purge Finished');
  };

  const displayData = useMemo(() => {
    let result = [...dataList];
    if (offlineModeActive) result = result.filter(d => d.status === SyncStatus.DOWNLOADED || d.status === SyncStatus.OUT_OF_SYNC);
    if (filterCategory !== 'ALL') result = result.filter(d => d.category === filterCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q));
    }
    return result;
  }, [dataList, offlineModeActive, filterCategory, searchQuery]);

  if (!token) return <AuthModal onSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Outfit']">
      
      {/* Dynamic Sync Status Bar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-between px-12 transition-all">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 bg-[#d40511] flex items-center justify-center font-black italic">OS</div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">OFFGRID <span className="text-[#d40511] not-italic">SYNC</span></h1>
            {syncPhase && <p className="text-[8px] font-black text-[#d40511] uppercase tracking-[0.2em] animate-pulse">{syncPhase}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-8">
           <div className="hidden md:flex flex-col text-right">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Active Operator</span>
              <span className="text-xs font-bold">{user?.name}</span>
           </div>
           <button onClick={handleLogout} className="text-[9px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-widest border border-white/5 px-3 py-2 transition-all">Log Out</button>
           <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-600 animate-pulse'}`} />
        </div>
      </nav>

      <main className="pt-32 pb-32 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-3 space-y-6">
          <section className="bg-zinc-900 p-6 border border-white/5 rounded-sm">
            <h3 className="text-[10px] font-black text-[#d40511] uppercase tracking-[0.3em] mb-6">Vault Metrics</h3>
            <div className="space-y-4">
              <div className="bg-black/40 p-4 border border-white/5">
                <span className="block text-zinc-600 text-[8px] font-black uppercase mb-1">Local Cache</span>
                <span className="text-xl font-black">{(totalMB/1024).toFixed(2)} <span className="text-zinc-500 text-xs">GB</span></span>
                <div className="w-full h-1 bg-zinc-800 mt-2"><div className="h-full bg-emerald-500" style={{ width: `${(totalMB/10000)*100}%` }} /></div>
              </div>
              <button 
                onClick={() => setSelectionMode(!selectionMode)}
                className={`w-full py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${selectionMode ? 'bg-white text-black' : 'text-zinc-400 border-white/10'}`}
              >
                {selectionMode ? 'Cancel Selection' : 'Selection Mode'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setOfflineModeActive(true)} className={`py-3 text-[9px] font-black uppercase border tracking-widest ${offlineModeActive ? 'bg-[#d40511]' : 'border-white/5 text-zinc-600'}`}>Local</button>
                <button onClick={() => setOfflineModeActive(false)} className={`py-3 text-[9px] font-black uppercase border tracking-widest ${!offlineModeActive ? 'bg-white text-black' : 'border-white/5 text-zinc-600'}`}>Cloud</button>
              </div>
            </div>
          </section>

          <div className="p-4 border border-white/5 rounded-sm">
            <h4 className="text-[8px] font-black text-zinc-600 uppercase mb-3">Sync Filters</h4>
            <div className="flex flex-col gap-2">
              {['ALL', 'WIFI', 'SYSTEM', 'MANUAL', 'AUTH', 'GEO'].map(cat => (
                <button 
                  key={cat} onClick={() => setFilterCategory(cat)}
                  className={`text-left text-[10px] font-bold uppercase p-2 border border-white/5 transition-all ${filterCategory === cat ? 'bg-zinc-800 text-white border-l-[#d40511] border-l-2' : 'text-zinc-600 hover:text-zinc-300'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayData.map(item => (
              <DataCard 
                key={item.id} data={item} 
                isSelectionMode={selectionMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
            {displayData.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 opacity-30">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No records found in registry</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bulk Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#d40511] px-8 py-4 flex items-center gap-8 shadow-2xl z-[150] rounded-sm">
          <span className="text-xs font-black uppercase tracking-widest">{selectedIds.size} Records Targeted</span>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex gap-4">
            <button onClick={() => bulkAction('secure')} className="text-[10px] font-black uppercase tracking-widest hover:underline">Bulk Secure</button>
            <button onClick={() => bulkAction('delete')} className="text-[10px] font-black uppercase tracking-widest hover:underline">Wipe Local</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
