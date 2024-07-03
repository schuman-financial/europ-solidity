//https://www.npmjs.com/package/defender-admin-client
//https://github.com/OpenZeppelin/defender-client/blob/master/examples/action-proposal/index.js
const { AdminClient } = require("defender-admin-client");
require("dotenv").config();
const client = new AdminClient({
  apiKey: process.env.DEFENDER_TEAM_API_KEY,
  apiSecret: process.env.DEFENDER_TEAM_API_SECRET,
});

const EUROPTokenV2 = artifacts.require("EUROPTokenTestV2");

module.exports = async function (deployer) {
  const proxy = "0xc1819855701A214876d84a0c6684c296665fB61A"; //V1 Deployed
  const administrator = "0x6f7280BF25d0D4A3f47b874bEdDdc4Ff4Cb44Cd6";
  const gnosisSafe = "0x6bbc98856545F9D8887FB1315f9Ed951a42db740";

  //Test to see if V2 inherit from V1
  //const eurustoken2_deployed = await EUROPTokenV2.at(proxy); //eurustoken proxy address (V1)
  //await eurustoken2_deployed.increment();
  //const value = await eurustoken2_deployed.retrieve();
  //console.log("value  " + value); //should be 43 or more

  //create Defender Admin custom proposal
  //this will create a custom proposal to update the admin
  const proposal = await client.createProposal({
    contract: {
      address: proxy,
      network: "rinkeby",
    }, // Target contract
    title: "Set Administrator", // Title of the proposal
    description: "Set Administrator", // Description of the proposal
    type: "custom", // Use 'custom' for custom admin actions
    functionInterface: {
      name: "setAdministrator",
      inputs: [{ internalType: "address", name: "sc_admin", type: "address" }],
    }, // Function ABI
    functionInputs: [administrator], // Arguments to the function
    via: gnosisSafe, // Multisig address
    viaType: "Gnosis Safe", // Either Gnosis Safe or Gnosis Multisig
  });
  console.log("Custom proposal created at:", proposal.url);
  // approve and sign the proposal
};
