const { docker } = require("@kaholo/plugin-library");
const {
  resolve: resolvePath,
} = require("path");
const {
  exec,
  assertPathExistence,
  triageCommand,
} = require("./helpers");
const {
  PYTEST_DOCKER_IMAGE,
  PYTEST_PREP_COMMANDS,
  PYTEST_RUNAS_COMMANDS,
} = require("./consts.json");

async function execute({ command, workingDirectory, jsonReport }) {
  const runas = PYTEST_RUNAS_COMMANDS.join("; ");
  const prep = PYTEST_PREP_COMMANDS.join("; ");

  const triagedCommand = await triageCommand(command, jsonReport);

  const combinedCommands = `/bin/sh -c "${prep}; su -c \\\"${runas}; ${triagedCommand}\\\" pytestuser"`;

  const dockerCommandBuildOptions = {
    command: combinedCommands,
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

    shellEnvironmentalVariables = {
      ...dockerEnvironmentalVariables,
      PIP_ROOT_USER_ACTION: "ignore",
      [workingDirVolumeDefinition.path.name]: workingDirVolumeDefinition.path.value,
    };

    volumeDefinitionsArray.push(workingDirVolumeDefinition);
    dockerCommandBuildOptions.workingDirectory = workingDirVolumeDefinition.mountPoint.value;
  }

  dockerCommandBuildOptions.volumeDefinitionsArray = volumeDefinitionsArray;
  dockerCommandBuildOptions.environmentVariables = dockerEnvironmentalVariables;

  const dockerCommand = docker.buildDockerCommand(dockerCommandBuildOptions);

  const pytestOutput = { "stdout": "", "stderr": "" };

  const commandOutput = await exec(dockerCommand, {
    env: shellEnvironmentalVariables,
  }).catch((error) => {
    pytestOutput.stdout = error.stdout;
    pytestOutput.stderr = error.stderr;
  });

  // no caught errors
  if (commandOutput) {
    if (commandOutput.stderr !== "") {
      console.error(commandOutput.stderr);
      pytestOutput.cmderr = commandOutput.stderr;
    }
    if (commandOutput.stdout !== "") {
      return commandOutput.stdout;
    }
  }

  // caught a "real" error - fail the action
  if (pytestOutput.stderr !== "") {
    throw new Error(pytestOutput.stderr);
  }

  // caught error was probably just failing pytests
  if (pytestOutput.stdout !== "") {
    return pytestOutput.stdout;
  }

  // not sure how this is reachable code but just in case
  throw new Error(pytestOutput);
}

module.exports = {
  execute,
};
