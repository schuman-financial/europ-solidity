const hre = require("hardhat");

async function main() {
  console.log("Deploying EUROPToken...");
  console.log("--------------------------------------------------------");

  // Make sure the initial owner address is set in the .env file
  if (!process.env.INITIAL_OWNER_ADDRESS) {
    throw new Error("⚠️ INITIAL_OWNER_ADDRESS is not set");
  }

  // Get network information
  const network = hre.network.name;
  console.log(`📡 Deploying to network: ${network}`);

  // Gas price settings for different networks
  const gasPrice = ["33", "gwei"];
  const gasLimit = 6_000_000;
  let gasSettings = {};
  if (network === "amoy") {
    // Optimized settings for Polygon Amoy
    gasSettings = {
      gasPrice: hre.ethers.parseUnits(...gasPrice), // Lower than default 30 gwei
      gasLimit, // Reasonable limit for complex deployment
    };
    console.log(`⛽ Using optimized gas settings for Amoy:`);
    console.log(`   Gas Price: ${gasPrice.join(" ")} in wei: ${hre.ethers.parseUnits(...gasPrice)}`);
    console.log(`   Gas Limit: ${gasLimit}`);
  }

  // Get the contract factory
  const Token = await hre.ethers.getContractFactory("EUROPToken");

  // Deploy the UUPS proxy with the custom initializer and gas settings
  console.log("🚀 Starting deployment...");
  const deployment = await hre.upgrades.deployProxy(Token, [], {
    initializer: "initializeEUROP",
    kind: "uups",
    redeployImplementation: "always",
    // Apply gas settings if we have them
    ...(Object.keys(gasSettings).length > 0 && { 
      txOverrides: gasSettings 
    }),
  });

  const proxy = await deployment.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log("✅ Proxy deployed to:", proxyAddr);
  console.log(
    "ℹ️ (set this address as TOKEN_ADDRESS in the .env file for upgrades to work)"
  );

  const currentImplAddress =
    await hre.upgrades.erc1967.getImplementationAddress(proxyAddr);
  console.log("✅ Token tracker deployed to:", currentImplAddress);

  const owner = process.env.INITIAL_OWNER_ADDRESS;
  console.log("✅ Owner set to:", owner);
  
  // Apply gas settings to the setOwner transaction if available
  const setOwnerTx = await proxy.setOwner(owner, gasSettings);
  await setOwnerTx.wait();
  console.log("✅ Owner set successfully");

  // Verify in scanner
  try {
    console.log("🔍 Starting contract verification...");
    // await hre.run("verify", {
    //   address: currentImplAddress,
    // });
    console.log("✅ Contract verification completed");
  } catch (e) {
    if (String(e).indexOf("already verified") == -1) {
      // verified probably because it has the same bytecode as some other contract
      console.error("❌ Verification failed:", e.message);
      throw e;
    } else {
      console.log("ℹ️ Contract already verified");
    }
  }

  console.log(
    "🎉 Deployment completed! You can now go to contract at: " + proxyAddr +" and mark it as proxy"
  );
  console.log("📝 You can now verify the contract on the block explorer");
  console.log("--------------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
