# EUROP Solidity

1) Test with Truffle

```bash
truffle test test/Token.js 
truffle test test/UpgradedToken.js
```

2) Test with Ganache

```bash
# Compile 
truffle compile

# Migrate
truffle migrate --reset --network ganache
truffle migrate --network ganache 

# Test
truffle console 

# in the console 
EUROPTokenTest.deployed().then((instance) => {v1 = instance;})

EUROPTokenTestV2.deployed().then((instance) => {v2 = instance;})
```

3) Test

There are 3 parts in the migrations in the rinkbey part , remove the underscore before the migration file you want to test and do :

```bash
truffle migrate --network rinkeby  --reset
```

Or , first run the initial migration and the second migration: to deploy our contract :

```bash
truffle migrate --network rinkeby -f 1 --to 2
```

Then to upgrade let’s run the third migration: with the parameters -f 3 –to 3 :

```bash
truffle migrate --network rinkeby -f 3 --to 3
```

Then to test the upgrade or to interact with the contract let’s run the forth migration:
If you want to migrate the forth migration multiple times add the --reset option.

```bash
truffle migrate --network rinkeby  -f 4 --to 4
truffle migrate --network rinkeby --reset -f 4 --to 4
```
