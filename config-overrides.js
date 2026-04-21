module.exports = config => {
  require('react-app-rewire-postcss')(config, {
     plugins: loader => [
      require('postcss-rtl')()
    ]
  });

  config.output = config.output || {};
  config.output.hashFunction = 'sha256';

  return config;
};
