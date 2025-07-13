import React from "react";

interface PixelatedCardProps {
  children: React.ReactNode;
  className?: string;
}

const PixelatedCard: React.FC<PixelatedCardProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`bg-stone-800 p-6 border-2 border-black shadow-pixel ${className}`}
    >
      {children}
    </div>
  );
};

export default PixelatedCard;
