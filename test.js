const {
  PYTEST_PREP_COMMANDS,
  PYTEST_RUNAS_COMMANDS
} = require("./consts.json");

  const runas = PYTEST_RUNAS_COMMANDS.join("; ");
  const prep = PYTEST_PREP_COMMANDS.join("; ");

  const combinedCommands = `/bin/sh -c "${prep}; su -c \\\"${runas}; pytest\\\" pytest"`;

  console.log(combinedCommands);