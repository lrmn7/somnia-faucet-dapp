const hre = require("hardhat");
const { ethers } = hre;
const { parseUnits, formatUnits } = ethers;
const config = require("./constant/config");
const addresses = require("./constant/addresses");

const MAX_UINT = ethers.MaxUint256;

async function approveIfNeeded(tokenContract, spender, user) {
  try {
    const spenderAddress = await spender.getAddress();
    const userAddress = user.address;
    const allowance = await tokenContract.allowance(userAddress, spenderAddress);
    const tokenSymbol = await tokenContract.symbol();

    if (allowance >= MAX_UINT / 2n) {
      return;
    }

    console.log(`🔐  Approving ${spenderAddress} to spend ${tokenSymbol}...`);
    const tx = await tokenContract.connect(user).approve(spenderAddress, MAX_UINT);
    await tx.wait();
    console.log(`✅  Approval for ${tokenSymbol} successful.`);
  } catch (err) {
    console.error(`❌ Approval failed for ${await tokenContract.symbol()}:`, err.message || err);
    throw new Error("Approval step failed.");
  }
}

async function addLiquidity() {
  try {
    const [deployer] = await ethers.getSigners();
    if (!deployer) throw new Error("❌ No signer available.");
    console.log(`\n👤 Using signer: ${deployer.address}`);

    const Token = await ethers.getContractFactory("Token");
    const Pool = await ethers.getContractFactory("MultiSomtoolPool");
    const multiPool = Pool.attach(addresses.SomtoolPool);

    const [tokenAddresses] = await multiPool.getPoolState();
    console.log(`🔍 Found ${tokenAddresses.length} tokens in the pool.`);

    const liquidityAmounts = [];
    const tokensToProcess = [];

    for (const tokenAddr of tokenAddresses) {
      const tokenContract = Token.attach(tokenAddr);
      const decimals = await tokenContract.decimals();
      const amount = parseUnits(config.AMOUNT_OF_LIQUIDITY.toString(), decimals);
      tokensToProcess.push({ contract: tokenContract, amount: amount });
      liquidityAmounts.push(amount);
    }

    console.log("🧐 Verifying balances...");
    for (const token of tokensToProcess) {
      const balance = await token.contract.balanceOf(deployer.address);
      const symbol = await token.contract.symbol();
      if (balance < token.amount) {
        throw new Error(
          `❌ Insufficient balance for ${symbol}. Required: ${formatUnits(token.amount, await token.contract.decimals())}, but have: ${formatUnits(balance, await token.contract.decimals())}`
        );
      }
      console.log(`  - ✅ Sufficient balance for ${symbol}.`);
    }
    console.log("👍 All balances are sufficient.");

    console.log("🔄 Preparing approvals...");
    for (const token of tokensToProcess) {
      await approveIfNeeded(token.contract, multiPool, deployer);
    }
    console.log("✅ All approvals are set.");

    console.log("➕ Adding liquidity to the pool...");
    const tx = await multiPool.connect(deployer).addLiquidity(liquidityAmounts);
    const receipt = await tx.wait();

    console.log("✅ Liquidity added successfully!");
    console.log(`   Transaction Hash: ${receipt.hash}\n`);

  } catch (err) {
    console.error("🚨 Liquidity addition failed:", err.message || err);
    process.exit(1);
  }
}

addLiquidity();