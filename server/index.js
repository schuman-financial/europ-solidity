const express = require('express');
const app = express();

const {estimateGas} = require("../utils/gasPredict");
const {getEurusTxLogs} = require("../utils/eurusTxWatcher");

const eurusAddressEth = "0x88344216D4F259474b232C472bF5b40B2668D32f";
const infuraWebSocketEth = 'wss://ropsten.infura.io/ws/v3/7f7902ffcef4413881034763efc04488';

const eurusAddressPolygon = "0x16eed366cfE52176f3BBEEB79fB9Acd54587D748";
const infuraWebSocketMatic = 'wss://polygon-mumbai.infura.io/ws/v3/7f7902ffcef4413881034763efc04488';

app.get('/predictGas/:messagetype/:from', async (req,res) => {
    const Web3 = require('Web3');
    var web3 = new Web3(new Web3.providers.WebsocketProvider(infuraWebSocketEth));

    const address = req.params.from;
    const messageType = req.params.messagetype;

    const gas = await estimateGas(web3, eurusAddressEth, address, messageType, "EUR");

    res.json(gas);
})

app.get('/predictGasPolygon/:messagetype/:from', async (req,res) => {
    const Web3 = require('Web3');
    var web3 = new Web3(new Web3.providers.WebsocketProvider(infuraWebSocketMatic));

    const address = req.params.from;
    const messageType = req.params.messagetype;

    const gas = await estimateGas(web3, eurusAddressPolygon, address, messageType, "MATIC");

    res.json(gas);
})

app.get('/getTx', async (req,res) => {
    const txLog = await getEurusTxLogs(etherscanApiKey, eurusAddress, 1, 100);
    res.json(txLog);
})

app.listen(8080, () => {
    console.log("Serveur à l'écoute")
})