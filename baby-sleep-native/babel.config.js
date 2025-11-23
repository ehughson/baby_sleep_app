module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // expo-router/babel is deprecated in SDK 50+
    // babel-preset-expo already includes what's needed
  };
};

