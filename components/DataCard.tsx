
import React, { useMemo } from 'react';
import { UserData, SyncStatus } from '../types';

interface DataCardProps {
  data: UserData;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: () => void;
  onShare?: () => void;
  onResolveConflict?: (choice: 'local' | 'remote' | 'merge') => void;
}

const DataCard: React.FC<DataCardProps> = ({ 
  data, 
  isSelected, 
  isSelectionMode, 
  onToggleSelect, 
  onShare, 
  onResolveConflict 
}) => {
  const isDownloading = data.status === SyncStatus.DOWNLOADING;
  const isDownloaded = data.status === SyncStatus.DOWNLOADED;
  const isConflict = data.status === SyncStatus.OUT_OF_SYNC;

  const formattedTime = useMemo(() => {
    const date = new Date(data.lastModified || data.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date.toLocaleDateString()} at ${timeStr}`;
  }, [data.lastModified, data.timestamp]);

  return (
    <div 
      onClick={() => isSelectionMode && onToggleSelect?.()}
      className={`
      group relative p-6 bg-[#111] border transition-all duration-500 
      ${isSelectionMode ? 'cursor-pointer' : ''}
      ${isSelected ? 'border-[#d40511] bg-[#d40511]/5 scale-[0.98]' : 'border-white/5'}
      ${isDownloaded ? 'border-white/10 hover:border-[#d40511]/40' : 
        isConflict ? 'border-orange-500/40 bg-orange-500/5' : 'opacity-60'}
      rounded-sm overflow-hidden flex flex-col min-h-[220px]
    `}>
      {/* Selection Overlay */}
      {isSelectionMode && (
        <div className={`absolute top-4 right-4 w-5 h-5 border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#d40511] border-[#d40511]' : 'border-white/20'}`}>
          {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
        </div>
      )}

      {/* Progress Bar */}
      <div className={`absolute top-0 left-0 h-1 bg-zinc-800 w-full overflow-hidden transition-opacity duration-300 ${isDownloading ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-full bg-[#d40511] progress-stripe" style={{ width: `${data.progress}%` }} />
      </div>

      <div className="flex justify-between items-start mb-4">
        <span className={`text-[9px] font-black uppercase tracking-widest ${isDownloaded ? 'text-emerald-500' : (isConflict ? 'text-orange-500' : 'text-zinc-600')}`}>
          {data.category} {isDownloaded && '• OFFLINE READY'}
        </span>
        {!isSelectionMode && (
          <div className="flex items-center gap-2">
            {isDownloaded ? (
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
            ) : <svg className="w-3 h-3 text-zinc-700" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" /><path d="M9 13h2v5a1 1 0 11-2 0v-5z" /></svg>}
          </div>
        )}
      </div>
      
      <h3 className={`text-xl font-black mb-2 tracking-tight transition-colors ${isConflict ? 'text-orange-500' : 'group-hover:text-[#d40511]'}`}>
        {data.title}
      </h3>
      <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2">
        {data.content}
      </p>
      
      {isConflict && !isSelectionMode && (
          <div className="mt-auto mb-4 p-3 bg-black/40 border border-orange-500/10 rounded-sm">
              <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-2">Data Delta Detected</p>
              <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => onResolveConflict?.('local')} className="py-1.5 text-[8px] font-black uppercase border border-white/5 hover:bg-zinc-800">Local</button>
                  <button onClick={() => onResolveConflict?.('remote')} className="py-1.5 text-[8px] font-black uppercase bg-orange-500 text-black">Remote</button>
                  <button onClick={() => onResolveConflict?.('merge')} className="py-1.5 text-[8px] font-black uppercase border border-orange-500/30 text-orange-500">Merge</button>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex flex-col text-[9px] font-mono text-zinc-600">
          <span className="tracking-tighter">REF: {data.id}</span>
          <span>SYNC: {formattedTime}</span>
        </div>
      </div>
    </div>
  );
};

export default DataCard;
