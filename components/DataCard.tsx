
import React, { useMemo } from 'react';
import { UserData, SyncStatus } from '../types';

interface DataCardProps {
  data: UserData;
  onShare?: () => void;
}

const DataCard: React.FC<DataCardProps> = ({ data, onShare }) => {
  const isDownloading = data.status === SyncStatus.DOWNLOADING;
  const isDownloaded = data.status === SyncStatus.DOWNLOADED;
  const isConflict = data.status === SyncStatus.OUT_OF_SYNC;

  // Human readable timestamp formatting
  const formattedTime = useMemo(() => {
    const date = new Date(data.lastModified || data.timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`;
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
    
    return `${date.toLocaleDateString()} at ${timeStr}`;
  }, [data.lastModified, data.timestamp]);

  return (
    <div className={`
      group relative p-6 bg-[#111] border transition-all duration-500 
      hover:scale-[1.02] hover:z-10
      ${isDownloaded || isConflict ? 'border-white/10 hover:border-[#d40511]/60 hover:shadow-[0_0_30px_rgba(212,5,17,0.15)]' : 'border-white/5 opacity-70'}
      rounded-sm overflow-hidden
    `}>
      {/* Smooth Progress Bar */}
      <div 
        className={`absolute top-0 left-0 h-1 bg-zinc-800 w-full overflow-hidden transition-opacity duration-300 ${isDownloading ? 'opacity-100' : 'opacity-0'}`}
      >
        <div 
          className="h-full bg-[#d40511] transition-all duration-300 ease-out shadow-[0_0_10px_#d40511]" 
          style={{ width: `${data.progress}%` }}
        />
      </div>

      <div className="flex justify-between items-start mb-4">
        <span className={`text-[9px] font-black uppercase tracking-widest ${isDownloaded ? 'text-[#d40511]' : (isConflict ? 'text-orange-500' : 'text-zinc-600')}`}>
          {data.category}
        </span>
        <div className="flex items-center gap-2">
          {isDownloaded ? (
            <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-current" /> Ready
            </span>
          ) : isDownloading ? (
            <span className="text-[9px] font-black text-[#d40511] animate-pulse uppercase">Syncing...</span>
          ) : isConflict ? (
             <span className="text-[9px] font-black text-orange-500 uppercase">Version Conflict</span>
          ) : (
            <span className="text-[9px] font-black text-zinc-700 uppercase">Remote Only</span>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-black mb-2 tracking-tight group-hover:text-[#d40511] transition-colors">
        {data.title}
      </h3>
      <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2 font-medium">
        {data.content}
      </p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-col text-[10px] font-mono text-zinc-700">
          <span className="tracking-tighter">ID: {data.id}</span>
          <span>{formattedTime}</span>
        </div>
        
        {/* Share Action */}
        <button 
          onClick={(e) => { e.stopPropagation(); onShare?.(); }}
          className="p-2 rounded border border-white/5 hover:bg-zinc-800 hover:border-[#d40511]/40 text-zinc-600 hover:text-white transition-all group-hover:opacity-100 opacity-40"
          title="Share metadata"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DataCard;
