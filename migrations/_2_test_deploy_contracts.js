const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const EUROPToken = artifacts.require("EUROPTokenTestV1");

module.exports = async function (deployer) {
  // 1
  console.log("Deploying eurus contract...");
  const eurustoken = await deployProxy(
    EUROPToken,
    { kind: "uups" },
    { deployer }
  );
  await eurustoken.store(42);
  console.log("V1 Deployed", eurustoken.address);

  owner1 = await eurustoken.owner();
  console.log("Current owner " + owner1);

  //transfer Ownership of upgrade to Gnosis Safe
  const gnosisSafe = "0x6bbc98856545F9D8887FB1315f9Ed951a42db740";
  // The Owner change DEFAULT_ADMIN_ROLE
  await eurustoken.setOwner(gnosisSafe);
  console.log("Transferring ownership of upgrade...");
  await eurustoken.transferOwnership(gnosisSafe);
  console.log("Transferred ownership of upgrade to: ", gnosisSafe);

  owner2 = await eurustoken.owner();
  console.log("new owner " + owner2);
};
