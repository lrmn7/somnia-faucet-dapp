import React from 'react';

interface PixelatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const PixelatedButton: React.FC<PixelatedButtonProps> = ({ children, ...props }) => {
  return (
    <button
      className="bg-brand-orange text-white font-pixel py-3 px-6 shadow-pixel hover:shadow-pixel-hover transition-all duration-200 disabled:bg-gray-500 disabled:shadow-none"
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelatedButton;