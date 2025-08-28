module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  plugins: [
    'react-native-reanimated/plugin', // Ajoutez cette ligne à la fin du tableau
  ],
  };
};