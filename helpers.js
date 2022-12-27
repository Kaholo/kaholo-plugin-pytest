const util = require("util");
const childProcess = require("child_process");
const fs = require("fs/promises");

const exec = util.promisify(childProcess.exec);

async function assertPathExistence(path) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getFileContent({ PATH: path }) {
  if (assertPathExistence(path)) {
    try {
      return await fs.readFile(path, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Failed to read content of a file at ${path}: ${error.message || JSON.stringify(error)}`);
    }
  } else {
    console.error(`No file was found at ${path}`);
    return undefined;
  }
}

module.exports = {
  assertPathExistence,
  exec,
  getFileContent,
};
