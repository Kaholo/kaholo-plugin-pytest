const { docker, helpers } = require("@kaholo/plugin-library");

const {
  liveLogExec,
  getFileContent,
} = require("./helpers");
const {
  PYTEST_DOCKER_IMAGE,
  PYTEST_PREP_COMMANDS,
  PYTEST_RUNAS_COMMANDS,
  PYTEST_PIPREQS_COMMANDS,
  PYTEST_REQS_COMMAND,
  PYTEST_CLI_NAME,
  PYTEST_CLI_FULLPATH,
} = require("./consts.json");

async function execute(params) {
  const dockerCommandBuildOptions = await prepareBuildDockerCommandOptions(params);
  const dockerCommand = docker.buildDockerCommand(dockerCommandBuildOptions);

  const result = await liveLogExec({
    command: dockerCommand,
    options: {
      env: dockerCommandBuildOptions.shellEnvironmentalVariables,
    },
    onProgressFn: process.stdout.write.bind(process.stdout),
  }).catch((error) => {
    throw new Error(error.stderr || error.stdout || error.message || error);
  });

  if (params.jsonReport !== "none") {
    const report = await helpers.analyzePath(`${params.workingDirectory.absolutePath}/.report.json`);
    if (report.exists) {
      const jsonPath = { PATH: report.absolutePath };
      const jsonReport = await getFileContent(jsonPath);
      if (jsonReport) {
        return jsonReport;
      }
    }
  }
  return result;
}

async function prepareBuildDockerCommandOptions(params) {
  const {
    command,
    jsonReport,
    workingDirectory,
    altImage,
    environmentVariables,
  } = params;

  if (altImage) {
    if (altImage.substring(0, 6) !== "python") {
      console.error(`\nWARNING: Docker Hub "python" image is expected. Using image ${altImage} instead may yeild unreliable results.\n`);
    }
  }

  const runAsCommands = PYTEST_RUNAS_COMMANDS.join("; ");
  const prepCommands = PYTEST_PREP_COMMANDS.join("; ");

  const absoluteWorkingDirectory = workingDirectory.absolutePath || await helpers.analyzePath("./").absolutePath;

  const reqsFile = await helpers.analyzePath(`${absoluteWorkingDirectory}/requirements.txt`);

  let reqsCommands;
  if (!reqsFile.exists) {
    reqsCommands = PYTEST_PIPREQS_COMMANDS.join("; ");
  } else {
    reqsCommands = PYTEST_REQS_COMMAND;
  }

  const chosenCommand = chooseCommand(command, jsonReport);
  const combinedCommands = `${prepCommands}; su -c ${JSON.stringify(`${runAsCommands}; ${reqsCommands}; ${chosenCommand}`)} pytestuser`;

  const dockerCommandBuildOptions = {
    command: docker.sanitizeCommand(combinedCommands),
    image: altImage ?? PYTEST_DOCKER_IMAGE,
  };

  const dockerEnvironmentalVariables = { ...environmentVariables };
  const volumeDefinitionsArray = [];

  const workingDirVolumeDefinition = docker.createVolumeDefinition(absoluteWorkingDirectory);

  dockerEnvironmentalVariables[workingDirVolumeDefinition.mountPoint.name] = (
    workingDirVolumeDefinition.mountPoint.value
  );

  dockerCommandBuildOptions.shellEnvironmentalVariables = {
    ...environmentVariables,
    ...dockerEnvironmentalVariables,
    PIP_ROOT_USER_ACTION: "ignore",
    [workingDirVolumeDefinition.path.name]: workingDirVolumeDefinition.path.value,
  };

  volumeDefinitionsArray.push(workingDirVolumeDefinition);
  dockerCommandBuildOptions.workingDirectory = workingDirVolumeDefinition.mountPoint.value;

  dockerCommandBuildOptions.volumeDefinitionsArray = volumeDefinitionsArray;
  dockerCommandBuildOptions.environmentVariables = dockerEnvironmentalVariables;

  return dockerCommandBuildOptions;
}

function chooseCommand(command, jsonReport) {
  if (command.substring(0, PYTEST_CLI_NAME.length) !== PYTEST_CLI_NAME) {
    throw new Error(`Command must begin with "${PYTEST_CLI_NAME}".`);
  }
  const fullPathCommand = `${PYTEST_CLI_FULLPATH}${command.substring(PYTEST_CLI_NAME.length)}`;
  if (command.includes("--json-report") || jsonReport === undefined) {
    return fullPathCommand;
  }

  switch (jsonReport) {
    case "none":
      return fullPathCommand;
    case "full":
      return `${PYTEST_CLI_FULLPATH} --json-report${fullPathCommand.substring(PYTEST_CLI_FULLPATH.length)}`;
    case "summary":
      return `${PYTEST_CLI_FULLPATH} --json-report --json-report-summary${fullPathCommand.substring(PYTEST_CLI_FULLPATH.length)}`;
    default:
      throw new Error("Parameter JSON Report is not properly specified as \"none\", \"full\", or \"summary\"");
  }
}

module.exports = {
  execute,
};
