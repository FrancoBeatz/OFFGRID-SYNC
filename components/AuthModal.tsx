
import React, { useState } from 'react';
import CinematicButton from './CinematicButton';

interface AuthModalProps {
  onSuccess: (token: string, user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real production build, this hits the Express backend
      // For this environment, we simulate the network request and validation
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      
      // Simulate real delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mocking the behavior of the backend logic (linking data to user)
      const mockUser = { 
        id: 'usr_' + btoa(email).substring(0, 8), 
        name: isLogin ? 'Operator' : name, 
        email 
      };
      const mockToken = "os_jwt_" + btoa(JSON.stringify(mockUser));

      localStorage.setItem('os_token', mockToken);
      localStorage.setItem('os_user', JSON.stringify(mockUser));
      onSuccess(mockToken, mockUser);
    } catch (err) {
      setError('AUTHENTICATION FAILED: Invalid credentials or account already exists.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0a0a] p-6">
      {/* Background visual elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#d40511_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#d40511]" />
        
        <div className="mb-10 text-center">
          <div className="inline-block w-12 h-12 bg-[#d40511] mb-4 flex items-center justify-center font-black italic text-xl shadow-[0_0_20px_rgba(212,5,17,0.4)]">OS</div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">
            OFFGRID <span className="text-[#d40511] not-italic">SYNC</span>
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">
            Secure Data Infrastructure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Operator Name</label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="FULL NAME"
                className="w-full bg-black border border-white/5 p-4 text-xs font-bold uppercase tracking-widest focus:border-[#d40511] outline-none transition-colors"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Network ID (Email)</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="OPERATOR@OFFGRID.SYNC"
              className="w-full bg-black border border-white/5 p-4 text-xs font-bold uppercase tracking-widest focus:border-[#d40511] outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Clearance Key (Password)</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black border border-white/5 p-4 text-xs font-bold uppercase tracking-widest focus:border-[#d40511] outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-red-500 text-[9px] font-black uppercase tracking-tighter text-center">{error}</p>
            </div>
          )}

          <CinematicButton 
            label={loading ? 'Authorizing...' : (isLogin ? 'Initiate Link' : 'Register Operator')} 
            onClick={() => {}} 
            className="w-full justify-center mt-4" 
            disabled={loading}
          />
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
          >
            {isLogin ? "Request New Clearance (Register)" : "Existing Operator? (Login)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
