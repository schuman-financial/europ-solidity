const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const assert = require("assert");
const truffleAssert = require("truffle-assertions");
const sign = require("../utils/sign/metatx-sign");

const EUROPToken = artifacts.require("EUROPToken");
const Forwarder = artifacts.require("Forwarder");

const { Interface } = require("@ethersproject/abi");

contract("compile", (accounts) => {
  it("passes eurus meta-tx tests", async function () {
    const owner_dar = accounts[0];
    const administrator = accounts[1];
    const masterMinter = accounts[2];
    const reserve = accounts[3];
    const bob = accounts[4];
    const alice = accounts[5];
    const minter = accounts[6];
    const feesFaucet = accounts[7];

    const eurustoken = await deployProxy(EUROPToken);

    await eurustoken.setAdministrator(administrator, { from: owner_dar });
    await eurustoken.setMasterMinter(masterMinter, { from: owner_dar });

    await eurustoken.addMinter(minter, 10000, { from: masterMinter });
    await eurustoken.mint(reserve, 1000, { from: minter });

    await eurustoken.transfer(alice, 200, { from: reserve });

    //case 31A - permit
    const value = 50;

    const result = await sign.signERC2612Permit(
      web3.eth.currentProvider,
      eurustoken.address,
      alice,
      bob,
      value
    );

    await eurustoken.permit(
      alice,
      bob,
      value,
      result.deadline,
      result.v,
      result.r,
      result.s,
      { from: bob }
    );

    await eurustoken.transferFrom(alice, bob, value, { from: bob });

    assert.equal(await eurustoken.balanceOf(bob), 50, "Failed case31");
    assert.equal(await eurustoken.balanceOf(alice), 150, "Failed case31");
    console.log("case31A passed");

    //case 31B - transferWithAuthorization
    const result3 = await sign.signERC3009TWA(
      web3.eth.currentProvider,
      eurustoken.address,
      alice,
      bob,
      value / 2
    );

    await eurustoken.transferWithAuthorization(
      alice,
      bob,
      value / 2,
      result.deadline,
      result3.v,
      result3.r,
      result3.s,
      { from: bob }
    );

    assert.equal(await eurustoken.balanceOf(bob), 75, "Failed case31");
    assert.equal(await eurustoken.balanceOf(alice), 125, "Failed case31");
    console.log("case31B passed");

    await eurustoken.transfer(alice, value / 2, { from: bob });

    //case 32 - set fee faucet address
    await eurustoken.setFeeFaucet(feesFaucet, { from: administrator });
    console.log("case32 passed");

    //case 33 - update gasless_basefee
    await eurustoken.updateGaslessBasefee(5, { from: administrator });
    assert.equal(await eurustoken.getGaslessBasefee(), 5, "Failed case33");
    console.log("case33 passed");

    //case 34 - update fee_rate
    const rate = 1000;
    await eurustoken.updateTxFeeRate(rate, { from: administrator });
    assert.equal(await eurustoken.getTxFeeRate(), rate, "Failed case34");
    console.log("case34 passed");

    //case 35 - transfer with fees
    await eurustoken.transfer(alice, 10, { from: bob });

    assert.equal(await eurustoken.balanceOf(bob), 39, "Failed case35");
    assert.equal(await eurustoken.balanceOf(alice), 160, "Failed case35");
    assert.equal(await eurustoken.balanceOf(feesFaucet), 1, "Failed case35");
    console.log("case35 passed");

    //case 36 - trustedForwarder
    const forwarder = await deployProxy(Forwarder, [eurustoken.address]);
    await eurustoken.setTrustedForwarder(forwarder.address, {
      from: administrator,
    });

    assert.equal(
      await eurustoken.isTrustedForwarder(forwarder.address),
      true,
      "Failed case36"
    );
    assert.equal(
      await forwarder.getEurus(),
      eurustoken.address,
      "Failed case36"
    );
    console.log("case36 passed");

    //case 37 - bob forwards transaction where alice sends 10 EUROP to bob signed by alice
    const { abi } = require("../build/contracts/EUROPToken.json");
    const iEurus = await new Interface(abi);
    const data = iEurus.encodeFunctionData("transfer", [bob, 10]);

    const result2 = await sign.signForward(
      web3.eth.currentProvider,
      1337,
      alice,
      eurustoken.address,
      forwarder.address,
      1e6,
      0,
      data
    );

    await truffleAssert.passes(
      forwarder.verify(
        result2.request,
        result2.domainSeparator,
        result2.TypeHash,
        result2.suffixData,
        result2.signature
      ),
      "Failed case37"
    );

    await forwarder.execute(
      result2.request,
      result2.domainSeparator,
      result2.TypeHash,
      result2.suffixData,
      result2.signature,
      { from: bob, gas: 1e6 }
    );

    assert.equal(await eurustoken.balanceOf(bob), 54, "Failed case37");
    assert.equal(await eurustoken.balanceOf(alice), 144, "Failed case37");
    assert.equal(await eurustoken.balanceOf(feesFaucet), 2, "Failed case37");
    console.log("case37 passed");

    //case 38 - update incorrect fee_rate
    const rate2 = 100000;
    await truffleAssert.fails(
      eurustoken.updateTxFeeRate(rate2, { from: administrator })
    );
    console.log("case38 passed");

    //case 39 - Bob tries to call payGaslessBasefee from alice to bob
    await truffleAssert.fails(
      eurustoken.payGaslessBasefee(alice, bob, { from: bob })
    );
    console.log("case39 passed");

    //case 40 - update gasless_basefee (not enough funds)
    await eurustoken.updateGaslessBasefee(500, { from: administrator });
    assert.equal(await eurustoken.getGaslessBasefee(), 500, "Failed case40");
    await truffleAssert.fails(
      eurustoken.payGaslessBasefee(alice, bob, { from: forwarder })
    );
    console.log("case40 passed");

    //case 41 - new request type registration
    truffleAssert.eventEmitted(
      await forwarder.registerRequestType(
        "ForwardRequest2",
        "uint256 validUntil)"
      ),
      "RequestTypeRegistered"
    );
    console.log("case41 passed");

    //case 42 - bob tries to execute a payGaslessBasefee request from alice to bob signed by bob
    const data2 = iEurus.encodeFunctionData("payGaslessBasefee", [alice, bob]);

    /*
        const abi2 = require('ethereumjs-abi');
      
        const methodSignature = "payGaslessBasefee";
        const parameterTypes = ['address', 'address'];
        const methodID = abi2.methodID(methodSignature, parameterTypes).toString('hex');

        console.log(`Method ID: 0x${methodID}`);

        const methodId = data2.slice(0, 10);
        console.log(`Method ID: ${methodId}`);
        */

    const result4 = await sign.signForward(
      web3.eth.currentProvider,
      1337,
      bob,
      eurustoken.address,
      forwarder.address,
      1e6,
      0,
      data2
    );

    await truffleAssert.fails(
      forwarder.verify(
        result4.request,
        result4.domainSeparator,
        result4.TypeHash,
        result4.suffixData,
        result4.signature
      )
    );

    await truffleAssert.fails(
      forwarder.execute(
        result4.request,
        result4.domainSeparator,
        result4.TypeHash,
        result4.suffixData,
        result4.signature,
        { from: bob, gas: 1e6 }
      )
    );

    console.log("case42 passed");
  });
});
