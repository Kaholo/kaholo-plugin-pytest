const { docker } = require("@kaholo/plugin-library");
const { resolve: resolvePath } = require("path");

const {
  exec,
  assertPathExistence,
} = require("./helpers");
const {
  PYTEST_DOCKER_IMAGE,
  PYTEST_PREP_COMMANDS,
  PYTEST_RUNAS_COMMANDS,
  PYTEST_CLI_NAME,
} = require("./consts.json");

async function execute(params) {
  const dockerCommandBuildOptions = await prepareBuildDockerCommandOptions(params);

  const dockerCommand = docker.buildDockerCommand(dockerCommandBuildOptions);
  const pytestOutput = { stdout: "", stderr: "" };

  const commandOutput = await exec(dockerCommand, {
    env: dockerCommandBuildOptions.shellEnvironmentalVariables,
  }).catch((error) => {
    pytestOutput.stdout = error.stdout;
    pytestOutput.stderr = error.stderr;
  });

  // no caught errors
  if (commandOutput?.stderr) {
    console.error(commandOutput.stderr);
    pytestOutput.cmderr = commandOutput.stderr;
  }
  if (commandOutput?.stdout) {
    return commandOutput.stdout;
  }

  // caught a "real" error - fail the action
  if (pytestOutput.stderr) {
    throw new Error(pytestOutput.stderr);
  }
  // caught error was probably just failing pytests
  if (pytestOutput.stdout) {
    return pytestOutput.stdout;
  }
  throw new Error(pytestOutput);
}

async function prepareBuildDockerCommandOptions(params) {
  const {
    command,
    jsonReport,
    workingDirectory,
  } = params;

  const runAsCommands = PYTEST_RUNAS_COMMANDS.join("; ");
  const prepCommands = PYTEST_PREP_COMMANDS.join("; ");

  const chosenCommand = chooseCommand(command, jsonReport);
  const combinedCommands = `${prepCommands}; su -c ${JSON.stringify(`${runAsCommands}; ${chosenCommand}`)} pytestuser`;

  const dockerCommandBuildOptions = {
    command: docker.sanitizeCommand(combinedCommands),
    image: PYTEST_DOCKER_IMAGE,
  };

  const dockerEnvironmentalVariables = {};
  const volumeDefinitionsArray = [];

  if (workingDirectory) {
    const absoluteWorkingDirectory = resolvePath(workingDirectory);

    await assertPathExistence(absoluteWorkingDirectory);
    const workingDirVolumeDefinition = docker.createVolumeDefinition(absoluteWorkingDirectory);

    dockerEnvironmentalVariables[workingDirVolumeDefinition.mountPoint.name] = (
      workingDirVolumeDefinition.mountPoint.value
    );

    dockerCommandBuildOptions.shellEnvironmentalVariables = {
      ...dockerEnvironmentalVariables,
      PIP_ROOT_USER_ACTION: "ignore",
      [workingDirVolumeDefinition.path.name]: workingDirVolumeDefinition.path.value,
    };

    volumeDefinitionsArray.push(workingDirVolumeDefinition);
    dockerCommandBuildOptions.workingDirectory = workingDirVolumeDefinition.mountPoint.value;
  }

  dockerCommandBuildOptions.volumeDefinitionsArray = volumeDefinitionsArray;
  dockerCommandBuildOptions.environmentVariables = dockerEnvironmentalVariables;

  return dockerCommandBuildOptions;
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
  execute,
};
