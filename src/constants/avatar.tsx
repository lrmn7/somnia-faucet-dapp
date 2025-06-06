import { AvatarComponent } from '@rainbow-me/rainbowkit';
import Image from 'next/image';

export const CustomAvatar: AvatarComponent = ({ address, size }) => {
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${address}`;

  return (
    <Image
      src={avatarUrl}
      alt="DiceBear Avatar"
      width={size}
      height={size}
      style={{ borderRadius: '50%' }}
    />
  );
};
