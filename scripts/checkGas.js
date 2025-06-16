const hre = require("hardhat");

async function main() {
  console.log("⛽ Gas Price Checker for Token Deployment");
  console.log("=========================================");

  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);

  try {
    // Get current gas price from the network
    const provider = hre.ethers.provider;
    const feeData = await provider.getFeeData();
    
    console.log("\n🔍 Current Network Gas Information:");
    console.log("-----------------------------------");
    
    if (feeData.gasPrice) {
      const gasPriceGwei = hre.ethers.formatUnits(feeData.gasPrice, "gwei");
      console.log(`💰 Current Gas Price: ${gasPriceGwei} gwei`);
    }

    if (feeData.maxFeePerGas) {
      const maxFeeGwei = hre.ethers.formatUnits(feeData.maxFeePerGas, "gwei");
      console.log(`📈 Max Fee Per Gas: ${maxFeeGwei} gwei`);
    }

    if (feeData.maxPriorityFeePerGas) {
      const priorityFeeGwei = hre.ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei");
      console.log(`⚡ Max Priority Fee: ${priorityFeeGwei} gwei`);
    }

    // Estimate deployment costs
    console.log("\n💸 Estimated Deployment Costs:");
    console.log("-------------------------------");

    const estimatedGasForDeployment = 3000000; // Conservative estimate for proxy deployment
    const estimatedGasForOwnerSet = 50000; // Estimate for setOwner call

    if (feeData.gasPrice) {
      const deploymentCost = feeData.gasPrice * BigInt(estimatedGasForDeployment);
      const ownerSetCost = feeData.gasPrice * BigInt(estimatedGasForOwnerSet);
      const totalCost = deploymentCost + ownerSetCost;

      console.log(`🏗️  Proxy Deployment: ~${hre.ethers.formatEther(deploymentCost)} ${network === 'amoy' ? 'POL' : 'ETH'}`);
      console.log(`👤 Set Owner: ~${hre.ethers.formatEther(ownerSetCost)} ${network === 'amoy' ? 'POL' : 'ETH'}`);
      console.log(`💯 Total Estimated: ~${hre.ethers.formatEther(totalCost)} ${network === 'amoy' ? 'POL' : 'ETH'}`);
    }

    // Provide recommendations
    console.log("\n💡 Recommendations:");
    console.log("-------------------");
    
    if (network === "polygonAmoy") {
      console.log("✅ Polygon Amoy is a testnet with very low costs");
      console.log("✅ Recommended gas price: 25-30 gwei");
      console.log("✅ Gas limit: 6,000,000 should be sufficient");
      console.log("ℹ️  Make sure you have enough POL tokens from the faucet");
    } else {
      console.log("⚠️  This is not Amoy testnet");
      console.log("⚠️  Double-check gas prices before deployment");
    }

  } catch (error) {
    console.error("❌ Error fetching gas data:", error.message);
  }

  console.log("\n🚀 To deploy with optimized settings, run:");
  console.log(`   npx hardhat run scripts/deployToken.js --network ${network}`);
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 
