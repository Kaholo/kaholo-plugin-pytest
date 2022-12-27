# Kaholo Pytest Plugin
Pytest is a Python testing framework that originated from the PyPy project. It can be used to write various types of software tests, including unit tests, integration tests, end-to-end tests, and functional tests.

This plugin extends Kaholo to be able to run Pytest tests. This is equivalent to running command `pytest` at the command line.

## Use of Docker
This plugin relies on the [official Docker image](https://hub.docker.com/_/python) `python` to run the pytest command, `pytest`. This has many upsides but a few downsides as well of which the user should be aware.

The first time the plugin is used on each agent, docker may spend a minute or two downloading the image. After that the delay of starting up another docker image each time is quite small, a second or two. Command `pytest --version` is a quick and simple command to force the image to download and/or test if the image is already cached locally on the Kaholo agent.

Next, because the command is running inside a docker container, it will not have access to the complete filesystem on the Kaholo agent. Parameter "Working Directory" is particularly important for this. Suppose on the agent you have a repository cloned using the Git plugin at location `myproject/myapp`, and you wish to run `pytest tests/unit` for this project. This means there are pytest modules with names matching `test_*.py` or `*_test.py` in directory `myproject/myapp/tests/unit/`. This will be found if the working directory is `myproject/myapp` and the command is `pytest tests/unit`. Any files outside of `myproject/myapp` will not be accessible within the docker image running the `pytest` command. Absolute path can also be used. In this example the absolute path of the Working Directory might be `/twiddlebug/workspace/myproject/myapp`. If no working directory is specified the agent's default working directory is `/twiddlebug/workspace`, and the test might be run using command `pytest myproject/myapp/tests/unit`.

The docker container is destroyed once the command has successfully run, so output files will also be destroyed, apart from those within the working directory.

Since each run of the plugin starts with a fresh python image, some setup steps are required to prepare the image to run pytest commands. These can be found in the consts.json file of the plugin. They include:
* adding a user `pytestuser` to avoid errors caused by running as user "root"
* installing/upgrading modules pip, pytest, pytest-json-report, and pipreqs
* using pipreqs to identify and install/upgrade modules required by the project and tests

File consts.json also selects a specific version of the base python image to start with. Depending on how your python projects and tests were developed, some modifications or other version of python may be required to accomodate your pytest needs. If the plugin isn't working for you, please let us know.

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Method: Run Pytest Command
This method run any command that begins with `pytest`, for example `pytest --version` or `pytest tests/unit`. To run commands that do NOT start with `pytest`, see the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd) instead.

### Parameter: Working Directory
This is a path on the Kaholo Agent within which a project containing pytest modules exists. This is typically a repository cloned to the agent using the [Git Plugin](https://github.com/Kaholo/kaholo-plugin-git) earlier in the pipeline. Only files within this directory will be available to the pytest command, and only output written within this directory will be available on the agent once the Action has completed.

### Parameter: Command
This is the actual pytest command that will be run. The simplest command is just `pytest`, which will run all pytest modules found in the Working Directory.

### Parameter: JSON Report
This parameter allows for easy selection of Full or Summary JSON reports using module `pytest-json-report`. It is the equivalent of using `--json-report` (Full) or `--json-report-summary` (Summary) on the command line. If selected here, it is not necessary to add them to the command.