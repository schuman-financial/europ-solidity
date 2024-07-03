# Deploying with Defender + Hardhat

When deploying with Hardhat, the goal is to utilize a custom private key for a **deterministic and predetermined** contract address. This approach, however, renders Defender Deployment unfeasible for two specific reasons:

- We do not have control over Safe's address. Safe-based deployment requires the CREATE2 opcode, which sets the owner to a factory—at the same time, changing the Token to accept and use an initial owner other than `msg.sender` is possible, but it makes address predetermination impossible.
- Relayer deployment does not work for predetermined addresses because we can not provide a custom relayer private key.

For this reason:

1. Use a clean, pre-generated private key for deployment outside Defender.
2. At the time of deployment, set the new owner to a Gnosis Safe.
3. Upgrades are done through Defender, using the Safe's approvers to make the change.

## OpenZeppelin Setup

It is necessary to set up the target deployment environment in Defender:

### Relayer for deployments

While the relayer will not be used for initial deployment, it will be used to deploy new implementations during upgrade proposals. Ensure you create a relayer, fund it, and add it as a deployer** (default deploy approval process) in your deployment environment.

### Gnosis Safe for upgrades

Create a new Gnosis Safe as the initial contract owner. Add its address as the default upgrade approval process.

## Project Setup

1. `npm install`
2. Add `.env` file with the following contents:

```env
# Private key of the account that will deploy the contract
PRIVATE_KEY=

# OpenZeppelin Defender keys
DEFENDER_KEY=""
DEFENDER_SECRET=""

# RPC node access
INFURA_API_KEY=""

# Address of the owner/safe to be set when the contract is initially deployed
INITIAL_OWNER_ADDRESS=""

# Address of the deployed contract
TOKEN_ADDRESS=""

# Scanner API keys
ETHERSCAN_APIKEY=""
POLYGON_APIKEY=""
```

## Deployment

Change the network name to one of the networks defined in `hardhat.config.js`

```sh
npx hardhat --network sepolia run scripts/deployToken.js
```

Afterward, set the newly deployed contract address in your `.env` file.

### Local Deployment

It is possible to deploy the contract to a local node. For that purpose, run the server with
`npm run node` in a separate terminal window and deploy to `localhost` network.

## Upgrades

Ensure your environment's Defender keys and token contract are set in your .env file. Then run:

```sh
npx hardhat --network sepolia run scripts/upgradeToken.js
```

The script:
- Compiles the contract;
- Uses the Defender relayer (see above) to deploy the new implementation;
- Creates a new Upgrade Proposal for the owner's Safe;
- Shows you a Safe link to share with the owner's Safe approvers to approve or reject the proposal.

## Verifying contract manually

```
npx hardhat verify --network <network> <contract_adrr>
```
