// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

//Import OpenZeppelin library:
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract PokemonContract is ERC721, Ownable {
  struct Pokemon {
    string name;
    string pokeType;
    uint256 price; //Price in wei
  }

  uint256 private _nextTokenId;
  mapping(uint256 => Pokemon) public pokemons;

  event PokemonMinted(uint256 indexed tokenId, string name, string pokeType);

  constructor(
    string memory _name,
    string memory _symbol
  ) ERC721(_name, _symbol) Ownable(msg.sender) {
    _nextTokenId = 0;
  }

  function increment() private {
    _nextTokenId++;
  }

  function mintPokemon(
    string memory name,
    string memory pokeType,
    uint256 price
  ) external onlyOwner {
    uint256 tokenId = _nextTokenId;
    pokemons[tokenId] = Pokemon(name, pokeType, price);
    _safeMint(msg.sender, _nextTokenId); //Mint to contract

    emit PokemonMinted(tokenId, name, pokeType);
    increment();
  }

  function getNextTokenId() public view returns (uint256) {
    return _nextTokenId;
  }

  function getPokemon(uint256 tokenId) public view returns (Pokemon memory) {
    require(_ownerOf(tokenId) != address(0), "Token ID does not exist");
    return pokemons[tokenId];
  }

  function getTokenOwner(uint256 tokenId) public view returns (address) {
    require(_ownerOf(tokenId) != address(0), "Token ID does not exist");
    return ownerOf(tokenId);
  }

  function getTokenBalance(address owner) public view returns (uint256) {
    return balanceOf(owner);
  }
}
