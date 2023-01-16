const util = require("util");
const childProcess = require("child_process");
const fs = require("fs/promises");

const exec = util.promisify(childProcess.exec);

async function statPath(path) {
  let stats;
  try {
    stats = await fs.stat(path);
    if (stats.isFile()) {
      return "FILE";
    }
    if (stats.isDirectory()) {
      return "DIRECTORY";
    }
  } catch {
    return "DOES_NOT_EXIST";
  }
  return "UNKNOWN";
}

async function getFileContent({ PATH: path }) {
  const stat = await statPath(path);
  if (stat === "FILE") {
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
  statPath,
  exec,
  getFileContent,
};
