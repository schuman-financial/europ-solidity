/**
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2023 SCEME SAS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./Token.sol";

contract Forwarder is OwnableUpgradeable {
    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    using ECDSAUpgradeable for bytes32;
    string public constant GENERIC_PARAMS 
    = "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data";

    mapping(bytes32 => bool) public typeHashes;

    // Nonces of senders, used to prevent replay attacks
    mapping(address => uint256) private nonces;

    EUROPToken private _eurus;
    address private _eurusAddress;

    event RequestTypeRegistered(bytes32 indexed typeHash, string typeStr);

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function getNonce(address from)
    public view
    returns (uint256) {
        return nonces[from];
    }

    function getEurus() public view returns (address) {
        return _eurusAddress;
    }

    function initialize(address eurusToken) initializer public {
        __Ownable_init();

        require(eurusToken != address(0), "EUROP Forwarder: Eurus Token address can't be address 0");

        string memory requestType = string(abi.encodePacked("ForwardRequest(", GENERIC_PARAMS, ")"));
        registerRequestTypeInternal(requestType);
        _eurusAddress = eurusToken;
        _eurus = EUROPToken(eurusToken);
    }

    function verify(
        ForwardRequest calldata req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes calldata suffixData,
        bytes calldata sig
    ) external view {
        _verifyNonce(req);
        _verifySig(req, domainSeparator, requestTypeHash, suffixData, sig);

        bytes4 basefeeSelector = bytes4(keccak256("payGaslessBasefee(address,address)"));
        bytes4 reqBasefeeSelector = _getSelector(req.data);

        require(reqBasefeeSelector != basefeeSelector, "EUROP Forwarder: can't forward basefee payment");
    }

    function execute(
        ForwardRequest calldata req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes calldata suffixData,
        bytes calldata sig
    )
    external payable
    returns (bool success, bytes memory ret) {
        _verifyNonce(req);
        _verifySig(req, domainSeparator, requestTypeHash, suffixData, sig);
        _updateNonce(req);

        require(req.to == _eurusAddress, "EUROP Forwarder: can only forward Eurus transactions");

        bytes4 basefeeSelector = bytes4(keccak256("payGaslessBasefee(address,address)"));
        bytes4 reqBasefeeSelector = _getSelector(req.data);

        require(reqBasefeeSelector != basefeeSelector, "EUROP Forwarder: can't forward basefee payment");

        // solhint-disable-next-line avoid-low-level-calls
        (success,ret) = req.to.call{gas : req.gas, value : req.value}(abi.encodePacked(req.data, req.from));
        require(success, "EUROP Forwarder: failed tx execution");
        
        _eurus.payGaslessBasefee(req.from, _msgSender());

        return (success,ret);
    }


    function _verifyNonce(ForwardRequest memory req) internal view {
        require(nonces[req.from] == req.nonce, "EUROP Forwarder: nonce mismatch");
    }

    function _updateNonce(ForwardRequest memory req) internal {
        nonces[req.from]++;
    }

    function _getSelector(bytes calldata data) internal pure returns (bytes4) {
        require(data.length >= 4, "Data too short to extract selector");
        bytes4 selector;
        assembly {
            selector := calldataload(data.offset)
        }
        return selector;
    }

    function registerRequestType(string calldata typeName, string calldata typeSuffix) external onlyOwner(){
        for (uint i = 0; i < bytes(typeName).length; i++) {
            bytes1 c = bytes(typeName)[i];
            require(c != "(" && c != ")", "EUROP Forwarder: invalid typename");
        }

        string memory requestType = string(abi.encodePacked(typeName, "(", GENERIC_PARAMS, ",", typeSuffix));
        registerRequestTypeInternal(requestType);
    }

    function registerRequestTypeInternal(string memory requestType) internal {

        bytes32 requestTypehash = keccak256(bytes(requestType));
        typeHashes[requestTypehash] = true;
        emit RequestTypeRegistered(requestTypehash, string(requestType));
    }

    function _verifySig(
        ForwardRequest memory req,
        bytes32 domainSeparator,
        bytes32 requestTypeHash,
        bytes memory suffixData,
        bytes memory sig)
    internal
    view
    {

        require(typeHashes[requestTypeHash], "EUROP Forwarder: invalid request typehash");
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01", domainSeparator,
                keccak256(_getEncoded(req, requestTypeHash, suffixData))
            ));
        require(digest.recover(sig) == req.from, "EUROP Forwarder: signature mismatch");
    }

    function _getEncoded(
        ForwardRequest memory req,
        bytes32 requestTypeHash,
        bytes memory suffixData
    )
    public
    pure
    returns (
        bytes memory
    ) {
        return abi.encodePacked(
            requestTypeHash,
            abi.encode(
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            ),
            suffixData
        );
    }
}
