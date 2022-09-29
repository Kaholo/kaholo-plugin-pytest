const { docker } = require("@kaholo/plugin-library");
const {
  resolve: resolvePath,
} = require("path");
const {
  exec,
  assertPathExistence,
} = require("./helpers");
const {
  PYTEST_DOCKER_IMAGE,
  PYTEST_PREP_COMMANDS,
  PYTEST_RUNAS_COMMANDS
} = require("./consts.json");

async function execute({ command, workingDirectory }) {

  const runas = PYTEST_RUNAS_COMMANDS.join("; ");
  const prep = PYTEST_PREP_COMMANDS.join("; ");

  const combinedCommands = `/bin/sh -c "${prep}; su -c \\\"${runas}; ${command}\\\" pytestuser"`;

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

  const commandOutput = await exec(dockerCommand, {
    env: shellEnvironmentalVariables,
  }).catch((error) => {
    throw new Error(error.stderr || error.stdout || error.message || error);
  });

  if (commandOutput.stderr && !commandOutput.stdout) {
    throw new Error(commandOutput.stderr);
  };

  if (commandOutput.stderr) {
    console.error(commandOutput.stderr);
  }

  return commandOutput.stdout;
}

module.exports = {
  execute,
};
