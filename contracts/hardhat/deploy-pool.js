const { ethers } = require("hardhat");
const addresses = require("./constant/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🚀 Deployer address: ${deployer.address}`);
  const Pool = await ethers.getContractFactory("MultiSomtoolPool");
  const tokenAddresses = [
    addresses.ASSET_ONE,
    addresses.ASSET_TWO,
    addresses.ASSET_THREE, 
    addresses.ASSET_FOUR
  ];
  console.log("Deploying pool with tokens:", tokenAddresses);
  const pool = await Pool.deploy(tokenAddresses);
  await pool.waitForDeployment();

  const poolAddress = await pool.getAddress();
  console.log(`✅ SomtoolPool deployed at: ${poolAddress}`);
}

main().catch((err) => {
  console.error("❌ Error deploying SomtoolPool:", err);
  process.exit(1);
});