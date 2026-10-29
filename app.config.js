const appJson = require('./app.json');

// Everything else lives in app.json, which Expo reads automatically. This file exists only to
// set the web base path from an environment variable: the production build run by
// .github/workflows/deploy.yml sets EXPO_BASE_URL to the GitHub Pages subpath
// (https://<user>.github.io/<repo>/), while local dev (`npm run web`) leaves it unset and stays
// at the site root.
module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    experiments: {
      ...appJson.expo.experiments,
      baseUrl: process.env.EXPO_BASE_URL ?? '',
    },
  },
};
