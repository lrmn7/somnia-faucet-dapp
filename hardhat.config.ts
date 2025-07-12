import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    'somnia-testnet': {
      url: 'https://dream-rpc.somnia.network/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      'somnia-testnet': 'empty'
    },
    customChains: [
      {
        network: "somnia-testnet",
        chainId: 50312,
        urls: {
          apiURL: "https://somnia-poc.w3us.site/api",
          browserURL: "https://somnia-poc.w3us.site"
        }
      }
    ]
  }
};
export default config;