
import React from 'react';
import { UserData, SyncStatus } from '../types';

interface DataCardProps {
  data: UserData;
}

const DataCard: React.FC<DataCardProps> = ({ data }) => {
  const isDownloading = data.status === SyncStatus.DOWNLOADING;
  const isDownloaded = data.status === SyncStatus.DOWNLOADED;

  return (
    <div className="relative group p-6 bg-[#1a1a1a] border-l-4 border-transparent hover:border-[#d40511] transition-all duration-500 overflow-hidden">
      {isDownloading && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-[#d40511] transition-all duration-300" 
          style={{ width: `${data.progress}%` }}
        />
      )}
      
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">{data.category} // {data.id}</span>
        <div className={`w-2 h-2 rounded-full ${isDownloaded ? 'bg-green-500' : isDownloading ? 'bg-[#d40511] animate-pulse' : 'bg-gray-700'}`} />
      </div>
      
      <h3 className="text-xl font-bold mb-2 group-hover:text-[#d40511] transition-colors">{data.title}</h3>
      <p className="text-gray-400 text-sm line-clamp-2">{data.content}</p>
      
      <div className="mt-6 flex items-center gap-2">
        <span className="text-[10px] text-gray-600 font-mono italic">TS: {data.timestamp}</span>
      </div>
    </div>
  );
};

export default DataCard;
