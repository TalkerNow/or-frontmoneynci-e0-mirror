module.exports = config => {
  require('react-app-rewire-postcss')(config, {
     plugins: loader => [
      require('postcss-rtl')()
    ]
  });

  config.output = config.output || {};
  config.output.hashFunction = 'sha256';

  // Never ship a CRA/Workbox service worker (stale precache blocks JF hard-refresh).
  config.plugins = (config.plugins || []).filter(plugin => {
    const name = plugin && plugin.constructor && plugin.constructor.name;
    return !name || !/GenerateSW|InjectManifest|Workbox/i.test(name);
  });

  return config;
};
