
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
      // Simulate API call to the Node backend
      // In a real environment, this would hit http://localhost:5000/api/auth/...
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      const mockUser = { name: name || 'Operator', email };
      
      localStorage.setItem('os_token', mockToken);
      localStorage.setItem('os_user', JSON.stringify(mockUser));
      onSuccess(mockToken, mockUser);
    } catch (err) {
      setError('Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#d40511]" />
        
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">
            Vault <span className="text-[#d40511]">Access</span>
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {isLogin ? 'Identity Verification Required' : 'Create New Operator Profile'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Full Name</label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-black border border-white/5 p-3 text-sm focus:border-[#d40511] outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email Address</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-black border border-white/5 p-3 text-sm focus:border-[#d40511] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Access Key</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-black border border-white/5 p-3 text-sm focus:border-[#d40511] outline-none"
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}

          <CinematicButton 
            label={loading ? 'Verifying...' : (isLogin ? 'Enter Vault' : 'Initialize Profile')} 
            onClick={() => {}} 
            className="w-full justify-center mt-4" 
            disabled={loading}
          />
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
        >
          {isLogin ? "Don't have access? Register" : "Already registered? Login"}
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
