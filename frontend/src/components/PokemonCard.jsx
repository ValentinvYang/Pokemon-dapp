function PokemonCard({ pokemonId, seller, price }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "1rem",
        margin: "1rem",
        maxWidth: "250px",
      }}
    >
      <h3>Pokémon #{pokemonId}</h3>
      <p>Seller: {seller}</p>
      <p>Price: {price} ETH</p>
    </div>
  );
}
export default PokemonCard;
