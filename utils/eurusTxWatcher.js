const axios = require('axios');
const apiUrl = "https://api-rinkeby.etherscan.io/api"
const zeroAddress = "0x0000000000000000000000000000000000000000";

async function getEurusTxLogs(apiKey, contractAddress, page, offset){
    const url = `${apiUrl}?module=account&action=tokentx&contractaddress=${contractAddress}&page=${page}&offset=${offset}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

    const response = await axios.get(url);
    const {result} = await response.data;

    if(response.data.status != '1') return result;
    
    const parsedResult = [];
    result.forEach(function(item){
        parsedResult.push({
            txType: item.from == zeroAddress ? "Mint" : item.to == zeroAddress ? "Burn" : "Transfer",
            from: item.from,
            to: item.to,
            amount: item.value,
            blockNumber: item.blockNumber,
            timeStamp: item.timeStamp,
            txHash: item.hash
        })
    });

    return {result: parsedResult};
}

module.exports.getEurusTxLogs = getEurusTxLogs;