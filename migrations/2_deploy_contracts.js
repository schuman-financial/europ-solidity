const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const keccak256 = require("keccak256");
const { getCurrentGasPrices } = require("../utils/gasPredict");

require("dotenv").config();
const administrator = process.env.ADMIN_GNOSIS;
const masterMinter = process.env.MASTER_MINTER_GNOSIS;
const owner = process.env.OWNER_GNOSIS;

const EUROPToken = artifacts.require("EUROPToken");
const Forwarder = artifacts.require("Forwarder");

module.exports = async function (deployer, network) {
  console.log("   EUROP MIGRATION:");
  console.log("   ---------------");
  const eurustoken = await deployProxy(
    EUROPToken,
    { kind: "uups" },
    { deployer }
  );
  console.log("   > EUROP PROXY DEPLOYED: " + eurustoken.address);

  //const gasPrices = await getCurrentGasPrices();
  //const gasPrice = gasPrices.high * 1000000000;

  //const gasPrice = 200 * 1000000000;

  await eurustoken.setAdministrator(administrator); //, {gasPrice: gasPrice});
  const admin_address = await eurustoken.getRoleMember(keccak256("ADMIN"), 0);
  console.log("   > EUROP ADMIN SET: " + admin_address);

  await eurustoken.setMasterMinter(masterMinter); //, {gasPrice: gasPrice});
  const minter_address = await eurustoken.getRoleMember(
    keccak256("MASTER_MINTER"),
    0
  );
  console.log("   > EUROP MASTER MINTER SET: " + minter_address);

  /*
    const forwarder = await deployProxy(Forwarder, [eurustoken.address]);
    await eurustoken.setTrustedForwarder(forwarder.address);
    const isForwarder = await eurustoken.isTrustedForwarder(forwarder.address);
    if (isForwarder) console.log("   > EUROP FORWARDER SET: " + forwarder.address);


    var adapter = Migrations.interfaceAdapter;
    const web3 = adapter.web3;
    const provider = web3.currentProvider
    
    var block = web3.eth.getBlock("latest");
    console.log("gasLimit: " + block.gasLimit);
    */

  await eurustoken.setOwner(owner); //, {gasPrice: gasPrice});
  console.log("   > EUROP OWNER SET: " + owner);
};
