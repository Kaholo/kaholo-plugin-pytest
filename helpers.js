const util = require("util");
const childProcess = require("child_process");
const fs = require("fs/promises");

const { EMPTY_RETURN_VALUE } = require("./consts.json");

async function liveLogExec(params) {
  const {
    command,
    onProgressFn,
    options = {},
  } = params;

  let childProcessInstance;
  try {
    childProcessInstance = childProcess.exec(command, options);
  } catch (error) {
    throw new Error(error);
  }

  childProcessInstance.stdout.on("data", (data) => {
    onProgressFn?.(data);
  });
  childProcessInstance.stderr.on("data", (data) => {
    onProgressFn?.(data);
  });

  try {
    await util.promisify(childProcessInstance.on.bind(childProcessInstance))("close");
  } catch (error) {
    throw new Error(error);
  }

  return EMPTY_RETURN_VALUE;
}

async function getFileContent({ PATH: path }) {
  try {
    return await fs.readFile(path, { encoding: "utf8" });
  } catch (error) {
    throw new Error(`Failed to read content of a file at ${path}: ${error.message || JSON.stringify(error)}`);
  }
}

module.exports = {
  liveLogExec,
  getFileContent,
};
