const kaholoPluginLibrary = require("@kaholo/plugin-library");
const { execute } = require("./pytest-cli");

module.exports = kaholoPluginLibrary.bootstrap({
  runCommand: execute,
});
