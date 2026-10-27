const ID = 'tagmar-calendario';

// Interruptores do mundo prevalecem sobre qualquer configuração da cena.
// Ausência conserva o comportamento das versões anteriores.
export function getEnvironmentSettings(game) {
  return Object.fromEntries(['dayNightEnabled', 'weatherEnabled', 'tidesEnabled']
    .map(key => [key, game?.settings?.get(ID, key) !== false]));
}
