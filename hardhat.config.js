require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.8",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defender: {
    apiKey: process.env.DEFENDER_KEY,
    apiSecret: process.env.DEFENDER_SECRET,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: `0x${process.env.PRIVATE_KEY}`,
          balance: "1000000000000000000000000",
        },
      ],
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_API_KEY,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_API_KEY,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    amoy: {
      url: "https://polygon-amoy.infura.io/v3/" + process.env.INFURA_API_KEY,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    polygon: {
      url: "https://polygon-mainnet.infura.io/v3/" + process.env.INFURA_API_KEY,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    // Avalanche C-Chain configurations
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    // Other networks to be added here
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_APIKEY,
      sepolia: process.env.ETHERSCAN_APIKEY,
      polygon: process.env.POLYGON_APIKEY,
      avalanche: process.env.SNOWTRACE_APIKEY,
      avalancheFuji: process.env.SNOWTRACE_APIKEY,
    },
  },
};
