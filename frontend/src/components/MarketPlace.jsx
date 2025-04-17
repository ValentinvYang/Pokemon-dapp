import PokemonCard from "./PokemonCard.jsx";

export default function MarketPlace() {
  const pokemonIds = Array.from({ length: 50 }, (_, i) => i);

  return (
    <div>
      <h2>Welcome to the Pokémon Trading Interface!</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {pokemonIds.map((id) => (
          <PokemonCard key={id} pokemonId={id} />
        ))}
      </div>
    </div>
  );
}
