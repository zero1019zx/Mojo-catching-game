import React from 'react';

export const NeonPanel: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`relative overflow-hidden rounded-xl border border-white/20 bg-black/60 backdrop-blur-md shadow-[0_0_15px_rgba(0,255,255,0.3)] ${className}`}>
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
        <div className="relative z-10 p-4">
            {children}
        </div>
    </div>
);

export const NeonButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
    <button 
        className={`
            group relative px-8 py-3 font-bold text-cyan-400 uppercase tracking-widest
            border-2 border-cyan-400 overflow-hidden transition-all duration-300
            hover:text-black hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
        `}
        {...props}
    >
        <span className="relative z-10">{children}</span>
    </button>
);

export const NeonInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
    <input 
        className={`
            w-full bg-black/50 border-2 border-cyan-600 text-white px-4 py-2 font-mono outline-none
            focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all
            placeholder:text-gray-600
            ${className}
        `}
        {...props}
    />
);
