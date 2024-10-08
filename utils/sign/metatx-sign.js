"use strict";
const { TypedDataUtils, SignTypedDataVersion } = require('@metamask/eth-sig-util');
const { bufferToHex} = require('ethereumjs-util');
const ethers = require('ethers');

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.signERC2612Permit = exports.signERC3009twa = exports.signForward = void 0;
const rpc_1 = require("./rpc");
const lib_1 = require("./lib");
const MAX_INT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];
const createTypedERC2612Data = (message, domain) => {
    const typedData = {
        types: {
            EIP712Domain,
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        },
        primaryType: "Permit",
        domain,
        message,
    };
    return typedData;
};
const createTypedERC3009Data = (message, domain) => {
    const typedData = {
        types: {
            EIP712Domain,
            TransferWithAuthorization: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        },
        primaryType: "TransferWithAuthorization",
        domain,
        message,
    };
    return typedData;
};

const NONCES_FN = '0x7ecebe00';
const NAME_FN = '0x06fdde03';
const zeros = (numZeros) => ''.padEnd(numZeros, '0');
const getTokenName = (provider, address) => __awaiter(void 0, void 0, void 0, function* () { return lib_1.hexToUtf8((yield rpc_1.call(provider, address, NAME_FN)).substr(130)); });
const getDomain = (provider, token) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof token !== 'string') {
        return token;
    }
    const tokenAddress = token;
    const [name, chainId] = yield Promise.all([
        getTokenName(provider, tokenAddress),
        rpc_1.getChainId(provider),
    ]);
    const domain = { name, version: '1', chainId, verifyingContract: tokenAddress };
    return domain;
});

exports.signERC2612Permit = (provider, token, owner, spender, value = MAX_INT, deadline, nonce) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    const message = {
        owner,
        spender,
        value,
        nonce: nonce || (yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`)),
        deadline: deadline || MAX_INT,
    };
    const domain = yield getDomain(provider, token);
    const typedData = createTypedERC2612Data(message, domain);
    const sig = yield rpc_1.signData(provider, owner, typedData);
    return Object.assign(Object.assign({}, sig), message);
});
exports.signERC3009TWA = (provider, token, owner, spender, value, deadline, nonce) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    const message = {
        owner,
        spender,
        value,
        nonce: nonce || (yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`)),
        deadline: deadline || MAX_INT,
    };
    const domain = yield getDomain(provider, token);
    const typedData = createTypedERC3009Data(message, domain);
    const sig = yield rpc_1.signData(provider, owner, typedData);
    return Object.assign(Object.assign({}, sig), message);
});
exports.signForward = (provider, chainId, from, tokenAddress, forwarder, gas, nonce, data) => __awaiter(void 0, void 0, void 0, function* () {
    const EIP712DomainType = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
    ]
    
    const ForwardRequestType = [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'data', type: 'bytes' }
    ]
    
    const TypedData = (domain) => ({
        domain: {
        name: 'Eurus',
        version: '0.0.1',
        chainId: chainId,
        ...domain
        },
        primaryType: 'ForwardRequest',
        types: {
        EIP712Domain: EIP712DomainType,
        ForwardRequest: ForwardRequestType
        },
        message: {}
    });

    const typedData = TypedData({ verifyingContract: forwarder });

    const domainSeparator = bufferToHex(
        TypedDataUtils.hashStruct(
        "EIP712Domain", 
        typedData.domain, 
        typedData.types, 
        SignTypedDataVersion.V4
        )
    );

    const GenericParams = 'address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data';
    const TypeName = `ForwardRequest(${GenericParams})`;
    const TypeHash = ethers.utils.id(TypeName);  

    const request  = {
        from: from, 
        to: tokenAddress, 
        value: 0,
        gas: gas,
        nonce: nonce,
        data: data
    };

    const toSign = { ...typedData, message: request };

    const sig = yield rpc_1.signData2(provider, from, toSign);

    const result = {
        request: request, 
        domainSeparator: domainSeparator, 
        TypeHash: TypeHash, 
        suffixData: '0x', 
        signature: sig
    };

    return Object.assign(result);
});


