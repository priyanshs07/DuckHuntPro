import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-display tracking-wider transform transition-all active:scale-95 border-2 rounded-sm relative overflow-hidden";
  
  const variants = {
    primary: "bg-western-gold text-dust-brown border-dust-brown shadow-retro hover:bg-yellow-500",
    secondary: "bg-parchment text-dust-brown border-dust-brown shadow-retro hover:bg-[#e6dbc0]",
    danger: "bg-sunset-red text-parchment border-black shadow-retro hover:bg-red-700",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-xl",
    lg: "px-12 py-4 text-3xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};