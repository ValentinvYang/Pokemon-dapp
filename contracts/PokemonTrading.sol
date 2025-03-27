// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

//Import OpenZeppelin library:
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PokemonTrading is ERC721URIStorage, Ownable {
  uint256 private _nextTokenId;
  mapping(uint256 => string) private _tokenUris; //Currently not used

  //Create mapping that maps the tokenID to a struct that holds the stats of the pokemon
  mapping(uint256 => Pokemon) public _pokemonStats;

  //First approach: Store everything on chain -> Use enum and struct
  enum PokemonType {
    Fire,
    Water,
    Grass,
    Electric,
    Lightning
  }

  struct Pokemon {
    string name;
    PokemonType pokemonType;
    int level;
  }

  constructor(
    string memory _name,
    string memory _symbol
  ) ERC721(_name, _symbol) Ownable(msg.sender) {
    _nextTokenId = 0;
  }

  function increment() private {
    _nextTokenId++;
  }

  function mint(
    address to,
    string memory uri,
    string memory _name,
    PokemonType _pokemonType,
    int _level
  ) public onlyOwner {
    _safeMint(to, _nextTokenId);
    _setTokenURI(_nextTokenId, uri);

    setTokenStats(_nextTokenId, _name, _pokemonType, _level);
    increment();
  }

  function getNextTokenId() public view returns (uint256) {
    return _nextTokenId;
  }

  function getTokenURI(uint256 tokenId) public view returns (string memory) {
    return _tokenUris[tokenId];
  }

  function getTokenStats(uint256 tokenId) public view returns (Pokemon memory) {
    return _pokemonStats[tokenId];
  }

  function setTokenStats(
    uint256 tokenId,
    string memory _name,
    PokemonType _pokemonType,
    int _level
  ) private onlyOwner {
    Pokemon storage pk = _pokemonStats[tokenId];
    pk.name = _name;
    pk.level = _level;
    pk.pokemonType = _pokemonType;
  }

  function setTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
    _tokenUris[tokenId] = uri;
  }

  function getTokenOwner(uint256 tokenId) public view returns (address) {
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
