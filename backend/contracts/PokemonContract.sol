// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol"; // For local development logging

// OpenZeppelin base contracts
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonContract
 * @dev ERC721 contract for minting Pokemon NFTs with IPFS metadata.
 * Only the contract owner (typically backend/deployer) can mint new tokens.
 */

contract PokemonContract is ERC721, Ownable {
  uint256 private _nextTokenId;
  mapping(uint256 => string) private _tokenURIs;

  /// @notice Emitted when a new Pokemon is minted
  /// @param pokemonId The token ID of the minted Pokemon
  /// @param CID The IPFS CID used for the token metadata
  event PokemonMinted(uint256 indexed pokemonId, string CID);

  /// @notice Initializes the ERC721 Pokemon collection
  /// @param _name Name of the NFT collection
  /// @param _symbol Symbol of the NFT token
  constructor(
    string memory _name,
    string memory _symbol
  ) ERC721(_name, _symbol) Ownable(msg.sender) {
    _nextTokenId = 0;
  }

  /// @dev Internal utility to increment the token ID counter
  function increment() internal {
    _nextTokenId++;
  }

  /// @notice Mints a new Pokemon token with an IPFS metadata reference
  /// @dev Only callable by the contract owner
  /// @param ipfsCID The IPFS CID of the metadata (image + attributes)
  function mintPokemon(string memory ipfsCID) external onlyOwner {
    uint256 pokemonId = _nextTokenId;
    _safeMint(msg.sender, pokemonId); //Mint to owner
    _setTokenURI(pokemonId, ipfsCID);

    emit PokemonMinted(pokemonId, ipfsCID);
    increment();
  }

  /// @dev Stores the IPFS URI for a given token ID
  /// @param pokemonId The token ID
  /// @param _ipfsCID IPFS CID of the metadata JSON
  function _setTokenURI(uint256 pokemonId, string memory _ipfsCID) internal {
    _tokenURIs[pokemonId] = string(abi.encodePacked("ipfs://", _ipfsCID));
  }

  // --- View Functions ---

  /// @notice Returns the next token ID to be minted
  function getNextTokenId() public view returns (uint256) {
    return _nextTokenId;
  }

  /// @notice Returns the IPFS metadata URI for a token
  /// @param pokemonId Token ID to query
  function getTokenURI(uint256 pokemonId) public view returns (string memory) {
    require(_ownerOf(pokemonId) != address(0), "Token ID does not exist");
    return _tokenURIs[pokemonId];
  }

  /// @notice Returns the owner of a given token
  /// @param pokemonId Token ID to query
  function getTokenOwner(uint256 pokemonId) public view returns (address) {
    require(_ownerOf(pokemonId) != address(0), "Token ID does not exist");
    return ownerOf(pokemonId);
  }

  /// @notice Returns the number of Pokemon owned by an address
  /// @param owner The address to query
  function getTokenBalance(address owner) public view returns (uint256) {
    return balanceOf(owner);
  }

  /// @notice Checks whether a token exists
  /// @param pokemonId Token ID to check
  function exists(uint256 pokemonId) public view returns (bool) {
    return _ownerOf(pokemonId) != address(0);
  }

  /// @notice Returns a list of all minted token IDs
  /// @dev Iterates from 0 to `_nextTokenId - 1`
  function getAllMintedTokenIds() public view returns (uint256[] memory) {
    uint256 total = _nextTokenId;
    uint256[] memory ids = new uint256[](total);
    for (uint256 i = 0; i < total; i++) {
      ids[i] = i;
    }
    return ids;
  }
}
