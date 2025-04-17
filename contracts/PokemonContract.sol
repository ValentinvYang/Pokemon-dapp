// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

//Import OpenZeppelin library:
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract PokemonContract is ERC721, Ownable {
  uint256 private _nextTokenId;
  mapping(uint256 => string) private _tokenURIs;

  event PokemonMinted(uint256 indexed pokemonId, string CID);

  constructor(
    string memory _name,
    string memory _symbol
  ) ERC721(_name, _symbol) Ownable(msg.sender) {
    _nextTokenId = 0;
  }

  function increment() internal {
    _nextTokenId++;
  }

  function mintPokemon(string memory ipfsCID) external onlyOwner {
    uint256 pokemonId = _nextTokenId;
    _safeMint(msg.sender, pokemonId); //Mint to owner
    _setTokenURI(pokemonId, ipfsCID);

    emit PokemonMinted(pokemonId, ipfsCID);
    increment();
  }

  function _setTokenURI(uint256 pokemonId, string memory _ipfsCID) internal {
    _tokenURIs[pokemonId] = string(abi.encodePacked("ipfs://", _ipfsCID));
  }

  function getNextTokenId() public view returns (uint256) {
    return _nextTokenId;
  }

  function getTokenURI(uint256 pokemonId) public view returns (string memory) {
    require(_ownerOf(pokemonId) != address(0), "Token ID does not exist");
    return _tokenURIs[pokemonId];
  }

  function getTokenOwner(uint256 pokemonId) public view returns (address) {
    require(_ownerOf(pokemonId) != address(0), "Token ID does not exist");
    return ownerOf(pokemonId);
  }

  function getTokenBalance(address owner) public view returns (uint256) {
    return balanceOf(owner);
  }
}
