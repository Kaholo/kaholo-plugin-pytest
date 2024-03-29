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
    if (Number.isInteger(error)) {
      return error;
    }
    throw new Error(error);
  }

  return EMPTY_RETURN_VALUE;
}

async function getReportObject({ PATH: path }) {
  try {
    const reportText = await fs.readFile(path, { encoding: "utf8" });
    return JSON.parse(reportText);
  } catch (error) {
    throw new Error(`Failed to parse file as JSON: ${path} ${error.message || JSON.stringify(error)}`);
  }
}

module.exports = {
  liveLogExec,
  getReportObject,
};
