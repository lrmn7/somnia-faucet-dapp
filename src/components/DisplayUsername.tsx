import { useEffect, useState } from 'react';
import { getUsername } from '../lib/getusername';

interface DisplayUsernameProps {
  address: `0x${string}`;
}

const DisplayUsername = ({ address }: DisplayUsernameProps) => {
  const [username, setUsername] = useState<string | null>(null);
  const shortAddress = `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;

  useEffect(() => {
    let isMounted = true; 

    const fetchUsername = async () => {
      const name = await getUsername(address);
      if (isMounted) {
        setUsername(name);
      }
    };

    fetchUsername();
    return () => {
      isMounted = false;
    };
  }, [address]);
  return (
    <span className="font-bold text-brand-orange">
      {username ? username : shortAddress}
    </span>
  );
};

export default DisplayUsername;