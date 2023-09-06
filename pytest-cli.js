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
    throw new Error(error);
  });

  // Exit code 0 All tests were collected and passed successfully
  // Exit code 1 Tests were collected and run but some of the tests failed
  // Exit code 2 Test execution was interrupted by the user
  // Exit code 3 Internal error happened while executing tests
  // Exit code 4 pytest command line usage error
  // Exit code 5 No tests were collected
  if (Number.isInteger(result)) {
    switch (result) {
      case 0:
        // all good
        break;
      case 1:
        // some tests failed, Activity Log or JSON report explains it already
        break;
      case 2:
        throw new Error("Test execution was interrupted by the user.");
      case 3:
        throw new Error("Internal error happened while executing tests.");
      case 4:
        throw new Error("pytest command line useage error.");
      case 5:
        throw new Error("No tests were collected.");
      default:
        throw new Error(`Some error occurred but exit code ${result} isn't recognized.`);
    }
  }

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
    workingDirectory = await helpers.analyzePath("./"),
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

  const reqsFile = await helpers.analyzePath(`${workingDirectory.absolutePath}/requirements.txt`);

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

  const workingDirVolumeDefinition = docker.createVolumeDefinition(workingDirectory.absolutePath);

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
