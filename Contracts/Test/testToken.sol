// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetMinterPauserUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Blacklistable } from "../Blacklistable.sol";

contract EUROPTokenTestV1 is Initializable, ERC20PresetMinterPauserUpgradeable, Blacklistable, UUPSUpgradeable {
    
    bytes32 public constant ADMIN = keccak256('ADMIN');
    bytes32 public constant MASTER_MINTER = keccak256('MASTER_MINTER');

    mapping(address => uint256) public minterAllowed;

    event Mint(address indexed minter, address indexed to, uint256 amount);
    event MinterConfigured(address indexed minter, uint256 minterAllowedAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __ERC20PresetMinterPauser_init("EUROP", "EUROP");
        //__Pausable_init();
        //__AccessControl_init();
        __UUPSUpgradeable_init();
        __Ownable_init();

        _setRoleAdmin(MINTER_ROLE, MASTER_MINTER);
        _setupRole(ADMIN, address(0));
        _setupRole(MASTER_MINTER, address(0));
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /**
     * @dev Function to update the admin
     * @param sc_admin The address of the admin
     */
    function setAdministrator(address sc_admin)
        public virtual
    {
        revokeRole(ADMIN, getRoleMember(ADMIN, 0));
        revokeRole(PAUSER_ROLE, getRoleMember(PAUSER_ROLE, 0));  
        grantRole(ADMIN, sc_admin);
        grantRole(PAUSER_ROLE, sc_admin);
        updateBlacklister(sc_admin);
    }

    /**
      * @dev Function to update the admin
      * @param _masterMinter The address of the admin
      */
    function setMasterMinter(address _masterMinter)
        public virtual
    {
        revokeRole(MASTER_MINTER, getRoleMember(MASTER_MINTER, 0)); 
        grantRole(MASTER_MINTER, _masterMinter);
    }

    /**
     * @dev Function to add/update a new minter
     * @param minter The address of the minter
     * @param minterAllowedAmount The minting amount allowed for the minter
     */
    function addMinter(address minter, uint256 minterAllowedAmount)
        public virtual
    {
        minterAllowed[minter] = minterAllowedAmount;
        grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Function to remove a minter
     * @param minter The address of the minter to remove
     */
    function removeMinter(address minter)
        public virtual
    {
        minterAllowed[minter] = 0;
        revokeRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Function to update the minting allowance of a minter
     * @param minter The address of the minter
     * @param minterAllowedAmount The new minting amount allowed for the minter
     */
    function updateMintingAllowance(address minter, uint256 minterAllowedAmount)
        public virtual onlyRole(MASTER_MINTER)
    {
        minterAllowed[minter] = minterAllowedAmount;
    }

    /**
     * @dev Function to mint tokens
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint. Must be less than or equal
     * to the minterAllowance of the caller.
     */
    function mint(address _to, uint256 _amount)
        public
        onlyRole(MINTER_ROLE)
        whenNotPaused
        notBlacklisted(_to)
        override
    {
        require(_amount > 0, "FiatToken: mint amount not greater than 0");

        uint256 mintingAllowedAmount = minterAllowed[msg.sender];
        require(
            _amount <= mintingAllowedAmount,
            "FiatToken: mint amount exceeds minterAllowance"
        );
        minterAllowed[msg.sender] = mintingAllowedAmount - _amount ;
        _mint(_to, _amount);
        emit Mint(msg.sender, _to, _amount);
    }

    
    /**
     * @dev allows a minter to burn some of its own tokens
     * Validates that caller is a minter and that sender is not blacklisted
     * amount is less than or equal to the minter's account balance
     * @param _amount uint256 the amount of tokens to be burned
     */
    function burn(uint256 _amount)
        public virtual override
        whenNotPaused
        onlyRole(MINTER_ROLE)
        notBlacklisted(msg.sender)
    {
        _burn(msg.sender, _amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal virtual override
    {
        require(
            !blacklisted[from],
            "Blacklistable: account is blacklisted"
        );
        super._beforeTokenTransfer(from, to, amount);

    }

    /**
     * @dev force a transfer from any account to any account
     * Validates that caller is the admin
     * @param from address the account from wich to send
     * @param to address the account that will receive the tokens
     * @param amount uint256 the amount of token to send 
     */
    function forceTransfer(address from, address to, uint256 amount)
        public virtual onlyRole(ADMIN)
    {
        _transfer(from, to, amount);
    }
    
    /**
      * @dev Function to update the DEFAULT_ADMIN_ROLE 
      * @param _owner The address of the owner
      */
    function setOwner(address _owner)
        public virtual
    { 
        grantRole(DEFAULT_ADMIN_ROLE, _owner);
        revokeRole(DEFAULT_ADMIN_ROLE, getRoleMember(DEFAULT_ADMIN_ROLE, 0));
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(DEFAULT_ADMIN_ROLE)
        override
    {}
    
    ///Test
    uint256 private value;

    // Emitted when the stored value changes
    event ValueChanged(uint256 newValue);

    // Stores a new value in the contract
    function store(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }

    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return value;
    }
}