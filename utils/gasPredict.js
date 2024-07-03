const { Interface } = require("@ethersproject/abi");
const axios = require("axios");
const { abi } = require("../build/contracts/EUROPToken.json");

const vitalik = "0x55870ccae9611Fc137DD9C561CdF4f13779238a9"; //address random

async function estimateGas(
  web3,
  eurusTokenAddress,
  senderAddress,
  messageType,
  symbol
) {
  if (
    messageType != "transfer" &&
    messageType != "approve" &&
    messageType != "mint"
  ) {
    return "EstimateGas Error: message type not reconized";
  }
  try {
    const iEurus = await new Interface(abi);

    const request = {
      from: senderAddress,
      to: eurusTokenAddress,
      value: 0,
      gas: 1e6,
      data: iEurus.encodeFunctionData(messageType, [vitalik, 10]),
    };
    const gasLimit = await web3.eth.estimateGas(request);

    const block = await web3.eth.getFeeHistory(1, "pending", [25]); //1er quartile
    const basefee = parseInt(block.baseFeePerGas[1], 16);
    const tip = parseInt(block.reward[0][0], 16);
    const gasprice = gasLimit * (basefee + tip);

    const url = `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=EUR`;
    const response = await axios.get(url);
    const { EUR } = await response.data;

    const gpinEUR = (gasprice * EUR) / 1e18;

    const price = {
      wei: gasprice,
      eur: gpinEUR,
    };

    return price;
  } catch (error) {
    console.error(error);
    return "EstimateGas " + error;
  }
}

async function getCurrentGasPrices() {
  let response = await axios.get(
    "https://ethgasstation.info/json/ethgasAPI.json"
  );
  let prices = {
    low: response.data.safeLow / 10,
    medium: response.data.average / 10,
    high: response.data.fast / 10,
  };
  return prices;
}

module.exports.estimateGas = estimateGas;
module.exports.getCurrentGasPrices = getCurrentGasPrices;
