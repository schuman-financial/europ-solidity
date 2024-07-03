const { deployProxy } = require("@openzeppelin/truffle-upgrades");
var assert = require("assert");
const truffleAssert = require("truffle-assertions");
const keccak256 = require("keccak256");

const EUROPToken = artifacts.require("EUROPToken");

contract("compile", (accounts) => {
  it("has a name", async function () {
    const eurustoken = await deployProxy(EUROPToken, { kind: "uups" });
    expect(await eurustoken.name()).to.equal("EUROP");
  });

  it("has a symbol", async function () {
    const eurustoken = await deployProxy(EUROPToken, { kind: "uups" });
    expect(await eurustoken.symbol()).to.equal("EUROP");
  });

  it("passes eurus tests", async function () {
    const owner_dar = accounts[0];
    const administrator = accounts[1];
    const masterMinter = accounts[2];
    const reserve = accounts[3];
    const bob = accounts[4];
    const alice = accounts[5];
    const minter = accounts[6];
    const eurustoken = await deployProxy(EUROPToken);
    const name = await eurustoken.name();
    await eurustoken.setAdministrator(administrator, { from: owner_dar });
    await eurustoken.setMasterMinter(masterMinter, { from: owner_dar });

    await eurustoken.addMinter(minter, 10000, { from: masterMinter });
    assert.equal(
      await eurustoken.minterAllowed(minter),
      10000,
      "Minter hasn't been granted the right amount"
    );

    // case01 - Administrator tries to mint 1000.00 Eurus coins
    await truffleAssert.fails(
      eurustoken.mint(administrator, 1000, { from: administrator })
    );
    console.log("case01 passed");

    // case02 - Minter mints 1000.00 Eurus coins to reserve
    await eurustoken.mint(reserve, 1000, { from: minter });
    assert.equal(
      await eurustoken.minterAllowed(minter),
      9000,
      "MinterAllowed number wrong"
    );
    assert.equal(
      await eurustoken.balanceOf(reserve),
      1000,
      "Reserve hasn't received the right amount of eurustokens"
    );
    console.log("case02 passed");

    // case03.1 - Minter tries to pause transfers
    await truffleAssert.fails(eurustoken.pause({ from: minter }));
    console.log("case03 passed");

    // case04 - Reserve transfers 200.00 Eurus coins to Alice
    await eurustoken.transfer(alice, 200, { from: reserve });
    assert.equal(await eurustoken.balanceOf(alice), 200, "Failed case05");
    assert.equal(await eurustoken.balanceOf(reserve), 800, "Failed case05");
    console.log("case04 passed");

    // case05 - Alice transfers 50.00 Eurus coins to Bob
    await eurustoken.transfer(bob, 50, { from: alice });
    assert.equal(await eurustoken.balanceOf(bob), 50, "Failed case06");
    assert.equal(await eurustoken.balanceOf(alice), 150, "Failed case06");
    console.log("case05 passed");

    // case06 - Bob tries to transfer 150.00 Eurus coins for Alice to Reserve
    await truffleAssert.fails(
      eurustoken.transferFrom(alice, reserve, 150, { from: bob })
    );
    console.log("case06 passed");

    // case07 - Alice transfers 150.00 Eurus coins to Reserve
    await eurustoken.transfer(reserve, 150, { from: alice });
    assert.equal(await eurustoken.balanceOf(reserve), 950, "Failed case08");
    assert.equal(await eurustoken.balanceOf(alice), 0, "Failed case08");
    console.log("case07 passed");

    // case08 - Administrator pauses transfers
    await eurustoken.pause({ from: administrator });
    assert.equal(await eurustoken.paused(), true, "Failed case09");
    console.log("case08 passed");

    // case09 - Reserve tries to transfer 200.00 Eurus coins to Alice
    await truffleAssert.fails(
      eurustoken.transfer(alice, 200, { from: reserve })
    );
    console.log("case09 passed");

    // case10 - Administrator resumes transfers
    await eurustoken.unpause({ from: administrator });
    assert.equal(await eurustoken.paused(), false, "Failed case11");
    console.log("case10 passed");

    // case11 - Administrator tries to force Bob to over transfer to Reserve
    await truffleAssert.fails(
      eurustoken.forceTransfer(bob, reserve, 200, { from: administrator })
    );
    console.log("case11 passed");

    // case12 - Administrator forces Bob to transfer 40.00 Eurus coins to Reserve
    await eurustoken.forceTransfer(bob, reserve, 40, { from: administrator });
    assert.equal(await eurustoken.balanceOf(bob), 10, "Failed case13");
    assert.equal(await eurustoken.balanceOf(reserve), 990, "Failed case13");
    console.log("case12 passed");

    // case12bis - Administrator forces Bob to transfer 10.00 Eurus coins to Reserve when bob is Blacklisted and txFeeRate = 1000
    const rate = 1000;
    await eurustoken.updateTxFeeRate(rate, { from: administrator });
    await eurustoken.blacklist(bob, { from: administrator });
    await eurustoken.forceTransfer(bob, reserve, 10, { from: administrator });
    assert.equal(await eurustoken.balanceOf(reserve), 1000, "Failed case12bis");
    assert.equal(await eurustoken.balanceOf(bob), 0, "Failed case12bis");
    await eurustoken.forceTransfer(reserve, bob, 10, { from: administrator });
    assert.equal(await eurustoken.balanceOf(bob), 10, "Failed case12bis");
    assert.equal(await eurustoken.balanceOf(reserve), 990, "Failed case12bis");
    await eurustoken.updateTxFeeRate(0, { from: administrator });
    console.log("case12bis passed");

    // case13 - Administrator tries to transfer from Reserve 40.00 Eurus coins to Bob
    await truffleAssert.fails(
      eurustoken.transferFrom(reserve, bob, 40, { from: administrator })
    );
    console.log("case13 passed");

    // case14 - Bob tries to over transfer to Alice
    await truffleAssert.fails(eurustoken.transfer(alice, 10000, { from: bob }));
    console.log("case14 passed");

    // case15 - Minter tries to lock Alice address
    await truffleAssert.fails(eurustoken.blacklist(alice, { from: minter }));
    console.log("case15 passed");

    // case17 - Reserve transfers 200.00 Eurus coins to Alice
    await eurustoken.transfer(alice, 200, { from: reserve });
    assert.equal(await eurustoken.balanceOf(alice), 200, "Failed case18");
    assert.equal(await eurustoken.balanceOf(reserve), 790, "Failed case18");
    console.log("case17 passed");

    // case16 - Administrator locks Alice's address
    await eurustoken.blacklist(alice, { from: administrator });
    assert.equal(await eurustoken.isBlacklisted(alice), true, "Failed case17");
    console.log("case16 passed");

    // case 16.B - Alice tries to send 10 Eurus to bob when blacklisted and the other way around
    await truffleAssert.fails(eurustoken.transfer(bob, 10, { from: alice }));
    await truffleAssert.fails(eurustoken.transfer(alice, 10, { from: bob }));
    console.log("case16B passed");

    // case18 - Administrator tries to burn 500.00 Eurus coins
    await eurustoken.mint(administrator, 500, { from: minter });
    await truffleAssert.fails(eurustoken.burn(500, { from: administrator }));
    console.log("case18 passed");

    // case19 - Administrator tries to change Minter
    const newMinter = accounts[7];
    await truffleAssert.fails(
      eurustoken.addMinter(newMinter, 10000, { from: administrator })
    );
    console.log("case19 passed");

    // case20 - masterMinter adds newMinter
    await eurustoken.addMinter(newMinter, 10000, { from: masterMinter });
    assert.equal(
      await eurustoken.hasRole(keccak256("MINTER_ROLE"), newMinter),
      true,
      "Failed case21"
    );
    console.log("case20 passed");

    // case21 - newMinter mints 500.00 Eurus coins
    await eurustoken.mint(newMinter, 500, { from: newMinter });
    assert.equal(await eurustoken.balanceOf(newMinter), 500, "Failed case23");
    console.log("case21 passed");

    // case22 - newMinter burns 500.00 Eurus coins
    await eurustoken.burn(500, { from: newMinter });
    assert.equal(await eurustoken.balanceOf(newMinter), 0, "Failed case23");
    console.log("case22 passed");

    // case23 - newMinter mint 1000.00 Eurus coins
    await eurustoken.mint(newMinter, 1000, { from: newMinter });
    assert.equal(await eurustoken.balanceOf(newMinter), 1000, "Failed case23");
    console.log("case23 passed");

    // case24 - Administrator pauses transfers
    await eurustoken.pause({ from: administrator });
    assert.equal(await eurustoken.paused(), true, "Failed case25");
    console.log("case24 passed");

    // case25 - Administrator tries to change Administrator
    const newAdmin = accounts[8];
    await truffleAssert.fails(
      eurustoken.setAdministrator(newAdmin, { from: administrator })
    );
    console.log("case25 passed");

    // case26 - Owner changes Administrator
    await eurustoken.setAdministrator(newAdmin, { from: owner_dar });
    assert.equal(
      await eurustoken.hasRole(keccak256("ADMIN"), newAdmin),
      true,
      "Failed case27"
    );
    assert.equal(
      await eurustoken.hasRole(keccak256("ADMIN"), administrator),
      false,
      "Failed case27"
    );
    console.log("case26 passed");

    // case27 - Administrator tries to resume transfer
    await truffleAssert.fails(eurustoken.unpause({ from: administrator }));
    console.log("case27 passed");

    // case28 - newAdministrator resumes transfer
    await eurustoken.unpause({ from: newAdmin });
    assert.equal(await eurustoken.paused(), false, "Failed case29");
    console.log("case28 passed");

    // case30 - newAdministrator unlocks Alice's address
    await eurustoken.unBlacklist(alice, { from: newAdmin });
    assert.equal(await eurustoken.isBlacklisted(alice), false, "Failed case30");
    console.log("case30 passed");

    // case41 - Master Minter reset Minter's allowance
    await eurustoken.updateMintingAllowance(minter, 50000, {
      from: masterMinter,
    });
    assert.equal(
      await eurustoken.minterAllowed(minter),
      50000,
      "Failed case41"
    );
    console.log("case41 passed");

    // case42 - Master Minter revoke Minter
    await eurustoken.removeMinter(minter, { from: masterMinter });
    assert.equal(await eurustoken.minterAllowed(minter), 0, "Failed case42");
    assert.equal(
      await eurustoken.hasRole(keccak256("MINTER_ROLE"), minter),
      false,
      "Failed case42"
    );
    console.log("case42 passed");

    // case43 - Owner change
    const newOwner = accounts[9];
    await truffleAssert.fails(
      eurustoken.setOwner(owner_dar, { from: owner_dar })
    );
    console.log(await eurustoken.hasRole(new Buffer(0x00), owner_dar));
    await eurustoken.setOwner(newOwner, { from: owner_dar });
    assert.equal(
      await eurustoken.hasRole(new Buffer(0x00), owner_dar),
      false,
      "Failed case43-1"
    );
    assert.equal(
      await eurustoken.hasRole(new Buffer(0x00), newOwner),
      true,
      "Failed case43-2"
    );
    console.log("case43 passed");
  });
});
