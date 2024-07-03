const {
  deployProxy,
  prepareUpgrade,
} = require("@openzeppelin/truffle-upgrades");
const truffleAssert = require("truffle-assertions");

const EUROPTokenV2 = artifacts.require("EUROPTokenTestV2");
const EUROPToken = artifacts.require("EUROPTokenTestV1");

contract("upgrades", (accounts) => {
  it("has a name", async function () {
    eurustoken = await deployProxy(EUROPToken, { kind: "uups" });
    await eurustoken.store(42);
    expect(await eurustoken.name()).to.equal("EUROP");
  });

  it("has a symbol", async function () {
    expect(await eurustoken.symbol()).to.equal("EUROP");
  });
  it("deploys", async function () {
    console.log("V1 Deployed", eurustoken.address);
  });
  it("change ProxyAdmin Ownership", async () => {
    owner_dar = accounts[0];
    administrator = accounts[1];
    const masterMinter = accounts[2];
    minter = accounts[6];
    await eurustoken.setAdministrator(administrator, { from: owner_dar });

    await eurustoken.setMasterMinter(masterMinter, { from: owner_dar });
    await eurustoken.addMinter(minter, 10000, { from: masterMinter });

    const owner = accounts[0];
    console.log("account owner  " + owner);
    owner1 = await eurustoken.owner();
    console.log("contract owner " + owner1);

    newOwner = accounts[7];

    await eurustoken.setOwner(newOwner, { from: owner_dar });
    assert.equal(
      await eurustoken.hasRole("0x00", newOwner),
      true,
      "Failed change DEFAULT_ADMIN_ROLE"
    );
    assert.equal(
      await eurustoken.hasRole("0x00", owner_dar),
      false,
      "Failed change DEFAULT_ADMIN_ROLE"
    );

    await eurustoken.transferOwnership(newOwner);

    owner2 = await eurustoken.owner();
    console.log("new owner " + owner2);

    //upgrade to new implementation
    //the upgrade is prepared but will be deployes by our gnosis Safe
    console.log("Preparing proposal...");
    eurustoken2 = await prepareUpgrade(eurustoken.address, EUROPTokenV2);
    console.log("V2Upgrade proposal", eurustoken2);
  });
  it("upgrades", async function () {
    newOwner = accounts[7];
    eurustoken2_deploy = await eurustoken.upgradeTo(eurustoken2, {
      from: newOwner,
    });
    eurustoken2_deployed = await EUROPTokenV2.at(await eurustoken.address);
    expect(await eurustoken2_deployed.name()).to.equal("EUROP");
    expect(await eurustoken2_deployed.symbol()).to.equal("EUROP");
    await eurustoken2_deployed.increment();
    const value = await eurustoken2_deployed.retrieve();
    assert.equal(value.toString(), "43");
    console.log("value  " + value);
  });
  it("works", async () => {
    // case01 - Administrator try to upgrade
    await truffleAssert.fails(
      eurustoken.upgradeTo(eurustoken2, { from: administrator })
    );
    // case02 - Minter try to upgrade
    await truffleAssert.fails(
      eurustoken.upgradeTo(eurustoken2, { from: minter })
    );
    // case03 - Previous Owner try to upgrade
    await truffleAssert.fails(
      eurustoken.upgradeTo(eurustoken2, { from: owner_dar })
    );
    // case04 - Administrator ty to transfer ownership
    await truffleAssert.fails(
      eurustoken.transferOwnership(newOwner, { from: administrator })
    );
    // case05 - Minter ty to transfer ownership
    await truffleAssert.fails(
      eurustoken.transferOwnership(newOwner, { from: minter })
    );
    // case06 - Previous Owner ty to transfer ownership
    await truffleAssert.fails(
      eurustoken.transferOwnership(newOwner, { from: owner_dar })
    );
  });
});
