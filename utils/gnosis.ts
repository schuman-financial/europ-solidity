// Guide : https://github.com/gnosis/safe-core-sdk/blob/main/packages/guides/integrating-the-safe-core-sdk.md
// https://docs.gnosis-safe.io/build/sdks/core-sdk

// Set up the sdk

// Initialize the Safe Service Client
import SafeServiceClient from '@gnosis.pm/safe-service-client'
import Web3 from 'web3'
import { Web3Adapter } from '@gnosis.pm/safe-core-sdk'
import Safe, { SafeFactory, SafeAccountConfig, EthSignSignature } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial, SafeTransactionData } from '@gnosis.pm/safe-core-sdk-types'

async function main() {

  const transactionServiceUrl = 'https://safe-transaction.gnosis.io'
  const safeService = new SafeServiceClient(transactionServiceUrl)

  // Initialize the Safe Core SDK

  const provider = "wallet provider" // see ex : https://github.com/Web3Modal/web3modal

  const web3 = new Web3(provider)

  const ethAdapterOwner1 = new Web3Adapter({
    web3,
    signerAddress: "safeOwner1Address"
  })

  // Deploy a new Safe

  const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapterOwner1 })

  const owners = ['0x<address>', '0x<address>', '0x<address>']
  const threshold = 2
  const safeAccountConfig: SafeAccountConfig = { owners, threshold }

  const safeSdk: Safe = await safeFactory.deploySafe(safeAccountConfig)

  // Create a Safe transaction

  const transactions: SafeTransactionDataPartial[] = [{
    to: '0x<address>',
    value: '<eth_value_in_wei>',
    data: '0x<data>'
  }]
  const safeTransaction = await safeSdk.createTransaction(transactions)

  // Off chain signature
  // owner1 signs and propose it to everyone
  const owner1Signature = await safeSdk.signTransaction(safeTransaction)
  const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
  const safeAddress = safeSdk.getAddress()
  await safeService.proposeTransaction({
    safeAddress,
    safeTransaction,
    safeTxHash,
    senderAddress: owners[0]
  })

  // owner2 find the transaction proposed
  const tx = await safeService.getTransaction(safeTxHash)
  
  // owner2 connect then signs
  const ethAdapterOwner2 = new Web3Adapter({ web3, signerAddress: "safeOwner2Address" })
  const safeSdk2 = await safeSdk.connect({ ethAdapter: ethAdapterOwner2, safeAddress })
  const hash = tx.safeTxHash
  const owner2Signature = await safeSdk2.signTransactionHash(hash)

  // owner1 recreates and executes transaction
  const safeTransactionData: SafeTransactionData = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: tx.operation,
    safeTxGas: tx.safeTxGas,
    baseGas: tx.baseGas,
    gasPrice: parseInt(tx.gasPrice),
    gasToken: tx.gasToken,
    refundReceiver: tx.refundReceiver,
    nonce: tx.nonce
  }
  const safeTransactionAgain = await safeSdk.createTransaction(safeTransactionData)
  tx.confirmations.forEach(confirmation => {
    const signature = new EthSignSignature(confirmation.owner, confirmation.signature)
    safeTransactionAgain.addSignature(signature)
  })

  const executeTxResponse = await safeSdk.executeTransaction(safeTransaction)
  const receipt = executeTxResponse.transactionResponse && (await executeTxResponse.transactionResponse.wait())
}

main()