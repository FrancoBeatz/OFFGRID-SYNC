
import React from 'react';

interface CinematicButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  label: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const CinematicButton: React.FC<CinematicButtonProps> = ({ 
  onClick, 
  variant = 'primary', 
  label, 
  disabled, 
  className,
  icon 
}) => {
  const base = "relative px-8 py-4 font-black uppercase tracking-widest text-sm transition-all duration-300 flex items-center gap-3 active:scale-95";
  
  const variants = {
    primary: "bg-[#d40511] text-white hover:bg-red-700 red-glow",
    outline: "border-2 border-white text-white hover:bg-white hover:text-black",
    ghost: "text-gray-400 hover:text-white"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : ''} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {label}
      <span className="absolute bottom-0 right-0 w-2 h-2 bg-white transform translate-x-1/2 translate-y-1/2"></span>
    </button>
  );
};

export default CinematicButton;
