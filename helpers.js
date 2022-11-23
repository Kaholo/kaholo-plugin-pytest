const util = require("util");
const childProcess = require("child_process");
const { access } = require("fs/promises");
const fs = require("fs");

const {
  PYTEST_CLI_NAME,
} = require("./consts.json");

const exec = util.promisify(childProcess.exec);

async function assertPathExistence(path) {
  try {
    await access(path, fs.constants.F_OK);
  } catch {
    throw new Error(`Path ${path} does not exist`);
  }
}

function chooseCommand(command, jsonReport) {
  if (command.substring(0, PYTEST_CLI_NAME.length) !== PYTEST_CLI_NAME) {
    throw new Error(`Command must begin with "${PYTEST_CLI_NAME}".`);
  }
  if (command.includes("--json-report") || jsonReport === undefined) {
    return command;
  }

  switch (jsonReport) {
    case "none":
      return command;
    case "full":
      return `${PYTEST_CLI_NAME} --json-report${command.substring(PYTEST_CLI_NAME.length)}`;
    case "summary":
      return `${PYTEST_CLI_NAME} --json-report --json-report-summary${command.substring(PYTEST_CLI_NAME.length)}`;
    default:
      throw new Error("Parameter JSON Report is not properly specified as \"none\", \"full\", or \"summary\"");
  }
}

module.exports = {
  assertPathExistence,
  exec,
  chooseCommand,
};
