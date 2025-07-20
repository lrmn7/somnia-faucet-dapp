"use client";

import { usePathname } from "next/navigation";
import Loader from "@/components/Loader";

const AppLoaderWrapper = () => {
  const pathname = usePathname();

  return <Loader key={pathname}>SOMT👀L</Loader>;
};

export default AppLoaderWrapper;
