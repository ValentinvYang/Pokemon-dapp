// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

//Import OpenZeppelin library:
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonContract is ERC721, Ownable {
  struct Pokemon {
    string name;
    string pokeType;
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
    string memory pokeType
  ) external onlyOwner {
    uint256 tokenId = _nextTokenId;
    pokemons[tokenId] = Pokemon(name, pokeType);
    _safeMint(msg.sender, _nextTokenId);

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

  //Solidity guide:
  ///////////////////////////////////////////////////
  // string public name;
  // string public symbol;

  // uint256 public nextTokenIdToMint;
  // address public contractOwner;

  // // token id => owner
  // mapping(uint256 => address) internal _owners;
  // // owner => token count
  // mapping(address => uint256) internal _balances;
  // // owner => (operator => yes/no)
  // mapping(address => mapping(address => bool)) internal _operatorApprovals;
  // // token id => token uri
  // mapping(uint256 => string) _tokenUris;

  // constructor(string memory _name, string memory _symbol) {
  //   name = _name;
  //   symbol = _symbol;
  //   nextTokenIdToMint = 0;
  //   contractOwner = msg.sender;
  // }

  // function balanceOf(address _owner) public view returns (uint256) {
  //   require(_owner != address(0), "Address can't be 0");
  //   return _balances[_owner];
  // }

  // function ownerOf(uint256 _tokenId) public view returns (address) {
  //   return _owners[_tokenId];
  // }

  // constructor() ERC721("PokemonCard", "PCard") {
  //   _nextTokenId = 0;
  // }
}
