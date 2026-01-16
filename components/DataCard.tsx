
import React from 'react';
import { UserData, SyncStatus } from '../types';

interface DataCardProps {
  data: UserData;
}

const DataCard: React.FC<DataCardProps> = ({ data }) => {
  const isDownloading = data.status === SyncStatus.DOWNLOADING;
  const isDownloaded = data.status === SyncStatus.DOWNLOADED;

  return (
    <div className={`relative p-6 bg-[#111] border transition-all duration-300 ${isDownloaded ? 'border-[#d40511]/40 shadow-[0_0_20px_rgba(212,5,17,0.1)]' : 'border-white/5 opacity-60'}`}>
      {isDownloading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 overflow-hidden">
          <div 
            className="h-full bg-[#d40511] transition-all duration-300" 
            style={{ width: `${data.progress}%` }}
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <span className={`text-[9px] font-black uppercase tracking-widest ${isDownloaded ? 'text-[#d40511]' : 'text-zinc-600'}`}>
          {data.category}
        </span>
        <div className="flex items-center gap-2">
          {isDownloaded ? (
            <span className="text-[9px] font-black text-emerald-500 uppercase">Ready Offline</span>
          ) : isDownloading ? (
            <span className="text-[9px] font-black text-[#d40511] animate-pulse uppercase">Saving...</span>
          ) : (
            <span className="text-[9px] font-black text-zinc-700 uppercase">Cloud Only</span>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-black mb-2 tracking-tight">{data.title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2">
        {data.content}
      </p>
      
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-700">
        <span>#{data.id}</span>
        <span>{data.timestamp}</span>
      </div>
    </div>
  );
};

export default DataCard;
