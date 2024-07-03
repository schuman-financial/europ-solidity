# EUROP Solidity

Smart-contracts in Solidy for the Ethereum implementation of EUROP.

## Get Started

```console
$ git clone https://gitlab.com/sceme/eurus-solidity.git
$ cd ./eurus-solidity
$ npm install
$ truffle compile
```

## Contracts

- Token : Main contract, implementation of the ERC20 token. Inerits from the [ERC20PresetMinterPauserUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20PresetMinterPauser) Openzeppelin contract and the Blacklistable contract.
- Blacklistable : contain the logic to implement a blacklist of users.
- Forwarder : Contract role is to forward tx signed off-chain to implement gasless transactions.

<br>

## Functions

The EUROP contract contains all the functions of the *ERC20PresetMinterPauserUpgradeable* contract, described here : [documentation](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20PresetMinterPauser). The other functions implemented are :

**setAdministrator(address sc_admin)**
*Description* : Function to update the admin.
*Parameters* : sc_admin The address of the admin

**setMasterMinter(address _masterMinter)**
*Description* : Function to update the masterMinter
*Parameters* : _masterMinter The address of the masterMinter

**addMinter(address minter, uint256 minterAllowedAmount)**
*Description* : Function to add/update a new minter
*Parameters* : minter The address of the minter, minterAllowedAmount The minting amount allowed for the minter

**removeMinter(address minter)**
*Description* : Function to remove a minter
*Parameters* : minter The address of the minter to remove

**updateMintingAllowance(address minter, uint256 minterAllowedAmount)**
*Description* : Function to update the minting allowance of a minter
*Parameters* : minter The address of the minter, minterAllowedAmount The new minting amount allowed for the minter

**mint(address _to, uint256 _amount)**
*Description* : Function to mint tokens
*Parameters* : _to The address that will receive the minted tokens,_amount The amount of tokens to mint (must be less than or equal to the minterAllowance of the caller)

**burn(uint256 _amount)**
*Description* : allows a minter to burn some of its own tokens. Validates that caller is a minter and that sender is not blacklisted, amount is less than or equal to the minter's account balance
*Parameters* : _amount uint256 the amount of tokens to be burned

**forceTransfer(address from, address to, uint256 amount)**
*Description* : force a transfer from any account to any account. Validates that caller is the admin
*Parameters* : from address the account from wich to send, to address the account that will receive the tokens, amount uint256 the amount of token to send

<br>

The EUROP contract also inherits and contains all functions from [UUPSUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable). Upgradeable contract uses an initialize function instead of a constructor, the Initializable contract allow us to initialize the state and prevent our contract to be initialized multiple time. We override the function [_authorizeUpgrade](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/utils/UUPSUpgradeable.sol) with the right modifier to authorize who will upgrade the contract.

Our contract also contains a function :
**setOwner(address _owner)**
*Description* :  Function to update the owner.
*Parameters* : _owner, the address of the owner.

The EUROP contract also inherits from ERC20Permit

**function permit( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)**
*Description* :  Approve in a gasless matter with permit signed offchain.
*Parameters* : _owner, the address of the owner. spender address of spender, uint256 value value of eurus to approve, deadline time after which signature is not valid anymore, (v, r, s) sliced signature (see EIP712)

## Fees

There are two types of possible fees on EUROP: txfee_rate and gasless_basefee

### txfee_rate
txfee_rate is a rate taken if each tranfer transaction by Eurus owners. This rate is out of 10000 and is calculated from the amount of the transaction with the calculateTxFee(uint256 txAmount) function (txAmount * txfee_rate / 10000)

we override the _beforeTokenTransfer function to call payTxFee(address from, uint256 txAmount) which will force a transfer from the payer "from" balance. If payer can't pay both his initial transaction and the fees, the transaction will fail

```solidity
    function updateTxFeeRate(uint256 newRate) public onlyRole(ADMIN){
        require(newRate <= 10000, "EUROP: new rate too high"); //out of 10000
        txfee_rate = newRate;
    }

    function getTxFeeRate() public view returns(uint256){
        return txfee_rate;
    }

    function calculateTxFee(uint256 txAmount) public view returns(uint256){
        return txAmount * txfee_rate / 10000;
    }

    function _payTxFee(address from, uint256 txAmount) internal returns(bool) {
        uint256 txFees = calculateTxFee(txAmount);
        require(balanceOf(from) >= txFees + txAmount, "EUROP: tx fees");
        if (_feesFaucet != address(0)){
            _transfer(from, _feesFaucet, txFees); 
        } 
        return true;
    }
```


### gasless_basefee
gasless_basefee is a fee taken when a an offchain transaction is forwarded from the trustedForwarder.

```solidity
    function setTrustedForwarder(address trustedForwarder) public onlyRole(ADMIN) {
        _trustedForwarder = trustedForwarder; 
    }

    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }
```

Paymaster uses the execute function from the Forwarder contract. We override _msgSender to execute the transaction as the signer.

```solidity
    function updateGaslessBasefee(uint256 newBaseFee) public onlyRole(ADMIN){
        gasless_basefee = newBaseFee;
    }

    function getGaslessBasefee() public view returns(uint256){
        return gasless_basefee;
    }
```

We implemented a function payGaslessBasefee to trigger payment (from payer (signer) to paymaster) which is triggered from trustedForwarder

```solidity
    function payGaslessBasefee(address payer, address paymaster) public {
        require(isTrustedForwarder(msg.sender), 
                "EUROP: only trustedForwarder can process gasless basefee payment");
        require(balanceOf(_msgSender()) >= gasless_basefee, 
                "EUROP: balance too low, can't pay gasless basefee");
        uint256 feeRate = txfee_rate;
        txfee_rate = 0;
        _transfer(payer, paymaster, gasless_basefee);
        txfee_rate = feeRate;
    }
```

## Tests

The tests are performed in the `test` folder. `Token.js` contains multiple tests scenarios concerning the main EUROP contract from 1 to 29 and `Token2.js` from 30 to 37. You can find here the list of tests cases that have been currently passed. `UpgradedToken.js` contains test scenarios concerning the upgradeability.

### Dependencies

@truffle/hdwallet-provider,
truffle,
@openzeppelin/contracts-upgradeable,
@openzeppelin/truffle-upgrades,
defender-admin-client,
truffle-assertions,
dotenv,
keccak256,

### EUROP

Launch with the command : `truffle test test/Token.js`

- case01 - Administrator tries to mint 1000.00 Eurus coins")
- case02 - Minter mints 1000.00 Eurus coins to reserve")
- case03 - Minter tries to resume transfers")
- case04 - Administrator resumes transfers")
- case05 - Reserve transfers 200.00 Eurus coins to Alice
- case06 - Alice transfers 50.00 Eurus coins to Bob
- case07 - Bob tries to transfer 150.00 Eurus coins for Alice to Reserve
- case08 - Alice transfers 150.00 Eurus coins to Reserve
- case10 - Reserve tries to transfer 200.00 Eurus coins to Alice
- case11 - Administrator resumes transfers
- case12 - Administrator tries to force Bob to over transfer to Reserve
- case13 - Administrator forces Bob to transfer 40.00 Eurus coins to Reserve
- case14 - Administrator tries to transfer for Reserve 40.00 Eurus coins to Bob
- case15 - Bob tries to over transfer to Alice
- case16 - Minter tries to lock Alice address
- case17 - Administrator locks Alice's address
- case18 - Reserve transfers 200.00 Eurus coins to Alice
- case19 - Administrator tries to burn 500.00 Eurus coins
- case20 - Administrator tries to change Minter
- case21 - Admin adds Minter
- case22 - newMinter burns 500.00 Eurus coins
- case23 - newMinter mints 500.00 Eurus coins
- case24 - newMinter mint 1000.00 Eurus coins
- case25 - Administrator pauses transfers
- case26 - Administrator tries to change Administrator
- case27 - Owner changes Administrator
- case28 - Administrator tries to resume transfer
- case29 - newAdministrator resumes transfer
- case30 - newAdministrator unlocks Alice's address
- case31 - Alice approves 100 EUROP to Bob through the permit function
- case32 - Administrator sets fee_faucet address
- case33 - Administrator updates gasless_basefee
- case34 - Administrator updates fee_rate
- case35 - Alice transfers 10 EUROP to bob (with fees)
- case36 - Administrator sets trustedForwarder
- case38 - Alice transfers 10 EUROP to bob through the Forwarder (with basefee & fees) 

Launch with the command : `truffle test test/UpgradedToken.js`

- case01 - Administrator try to upgrade
- case02 - Minter try to upgrade
- case03 - Previous Owner try to upgrade
- case04 - Administrator ty to transfer ownership
- case05 - Minter ty to transfer ownership
- case06 - Previous Owner ty to transfer ownership

## Deployment

### Setup .env

fill `.env exemple` with your Infura API key and Openzepplin Defender [Openzepplin Defender ](https://defender.openzeppelin.com/) API key.

### Migration

To deploy our contract we will use Truffle migrations. The Truffle Upgrades plugin provides a `deployProxy` function to deploy our upgradeable contract and then we will transfer the ownership to a multisig. Our migration script is `2_deploy_eurus.js`.

To deploy the contract (on rinkeby for example), simply run the command `npx truffle migrate --network rinkeby -f 1 --to 2`.

To deploy a new implementation of our contract use the third migration:`_3_prepare_propose_upgrade.js` script to prepare an upgrade and a Defender proposal, with the command `npx truffle migrate --network rinkeby -f 3 --to 3`.

Then to test the upgrade or to interact with the contract run the forth migration: `4_test_action_proposal.js` with the command `npx truffle migrate --network rinkeby -f 4 --to 4`.





