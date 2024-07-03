//https://www.npmjs.com/package/defender-admin-client
//https://github.com/OpenZeppelin/defender-client/blob/master/examples/upgrade-proposal/index.js
const { prepareUpgrade } = require("@openzeppelin/truffle-upgrades");
const { AdminClient } = require("defender-admin-client");
require("dotenv").config();
const client = new AdminClient({
  apiKey: process.env.DEFENDER_TEAM_API_KEY,
  apiSecret: process.env.DEFENDER_TEAM_API_SECRET,
});

const EUROPTokenV2 = artifacts.require("EUROPTokenTestV2");

module.exports = async function (deployer) {
  //2
  proxy = "0xc1819855701A214876d84a0c6684c296665fB61A"; //V1 Deployed
  //upgrade to new implementation
  //the upgrade is prepared but will be deployed by our gnosis Safe
  console.log("Preparing proposal...");
  const eurustoken2 = await prepareUpgrade(proxy, EUROPTokenV2, { deployer });
  console.log("V2Upgrade proposal", eurustoken2);

  //3
  const gnosisSafe = "0x6bbc98856545F9D8887FB1315f9Ed951a42db740";
  // create Defender Admin proposal and upgrade
  //this will add the proxy to defender and create a proposal
  const newImplementation = await eurustoken2; // not working : eurustoken2 undefined , not deployed
  const via = gnosisSafe;
  const viaType = "Gnosis Safe"; // or 'Gnosis Multisig', or 'EOA'
  ABI = [
    {
      inputs: [
        { internalType: "address", name: "_logic", type: "address" },
        { internalType: "bytes", name: "_data", type: "bytes" },
      ],
      stateMutability: "payable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "previousAdmin",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "newAdmin",
          type: "address",
        },
      ],
      name: "AdminChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "beacon",
          type: "address",
        },
      ],
      name: "BeaconUpgraded",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "implementation",
          type: "address",
        },
      ],
      name: "Upgraded",
      type: "event",
    },
    { stateMutability: "payable", type: "fallback" },
    { stateMutability: "payable", type: "receive" },
  ];
  const contract = {
    network: "rinkeby",
    address: proxy,
    name: "Eurus test3",
    abi: JSON.stringify(ABI),
  };
  const proposal = await client.proposeUpgrade(
    { newImplementation, via, viaType },
    contract
  );
  console.log("Upgrade proposal created at:", proposal.url);
  // approve and sign the proposal to deploy the new implementation
};
