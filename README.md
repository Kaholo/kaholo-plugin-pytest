# Kaholo Pytest Plugin
Pytest is a Python testing framework that originated from the PyPy project. It can be used to write various types of software tests, including unit tests, integration tests, end-to-end tests, and functional tests.

This plugin extends Kaholo to be able to run Pytest tests. This is equivalent to running command `pytest` at the command line.

If for whatever reason this plugin is lacking a feature required to successfully run your pytest tests, please do [let us know](https://kaholo.io/contact/). A more generic way (albeit technically more difficult) to run pytest that should work in any scenario is to use the [Kaholo Docker Plugin](https://github.com/Kaholo/kaholo-plugin-docker) method "Run Container". The Pytest Plugin is essentially the same thing, but with many of the details parameterized for a more user-friendly low-code experience.

## Prerequisites
There are few very important items to successfully use the plugin to execute pytest.
* Python version - most python projects are developed with a specific version of python, and using the wrong version can cause many types of failure. It is very important to select the correct version in parameter "Python Docker Image", e.g. `python:3.8.10`. The default is unlikely to be the correct choice.
* Requirements text file - a python project should have a requirements.txt file in the root, which is used as the "Working Directory" parameter. If a requirements.txt file is found there, the specified versions of requirements will be installed with `pip` before the tests are run. If no requirements.txt is found, `pipreqs` will be used instead in an attempt to create one. While this fallback method does often work, there are no guarantees. If an appropriate requirements.txt file is in the project but not in the "Working Directory", use the [Kaholo File System Plugin](https://github.com/Kaholo/kaholo-plugin-fs) to copy requirements.txt to the working directory before running the "Pytest Plugin" action.

## Use of Docker
This plugin relies on the [official Docker image](https://hub.docker.com/_/python) `python` to run the pytest command, `pytest`. This has many upsides but a few downsides as well of which the user should be aware.

The first time the plugin is used on each agent, docker may spend a minute or two downloading the image. After that the delay of starting up another docker image each time is quite small, a second or two. Command `pytest --version` is a quick and simple command to force the image to download and/or test if the image is already cached locally on the Kaholo agent.

Next, because the command is running inside a docker container, it will not have access to the complete filesystem on the Kaholo agent. Parameter "Working Directory" is particularly important for this. Suppose on the agent you have a repository cloned using the Git plugin at location `myproject/myapp`, and you wish to run `pytest tests/unit` for this project. This means there are pytest modules with names matching `test_*.py` or `*_test.py` in directory `myproject/myapp/tests/unit/`. This will be found if the working directory is `myproject/myapp` and the command is `pytest tests/unit`. Any files outside of `myproject/myapp` will not be accessible within the docker image running the `pytest` command. Absolute path can also be used. In this example the absolute path of the Working Directory might be `/twiddlebug/workspace/myproject/myapp`. If no working directory is specified the agent's default working directory is `/twiddlebug/workspace`, and the test might be run using command `pytest myproject/myapp/tests/unit`.

The docker container is destroyed once the command has successfully run, so output files will also be destroyed, apart from those within the working directory.

Since each run of the plugin starts with a fresh python image, some setup steps are required to prepare the image to run pytest commands. These can be found in the consts.json file of the plugin. They include:
* adding a user `pytestuser` to avoid errors caused by running as user "root"
* adding `.local/bin` to the PATH
* installing/upgrading modules pip, pytest, pytest-json-report
* installing dependencies listed in `requirements.txt` in the working directory
* using pipreqs to identify and install/upgrade modules required by the project and tests if there is no `requirements.txt`

File consts.json also specifies a specific default version of the base python image to start with. Depending on how your python projects and tests were developed, a different image may be needed. For that, use parameter `Python Docker Image`.

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Method: Run Pytest Command
This method run any command that begins with `pytest`, for example `pytest --version`, `pytest tests/unit`, `pytest -W ignore::UserWarning --maxfail=20 --no-warn-script-location`, or simply `pytest`. To run commands that do NOT start with `pytest`, see the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd) instead.

### Parameter: Working Directory
This is a path on the Kaholo Agent within which a project containing pytest modules exists. This is typically a repository cloned to the agent using the [Git Plugin](https://github.com/Kaholo/kaholo-plugin-git) earlier in the pipeline. Only files within this directory will be available to the pytest command, and only output written within this directory will be available on the agent once the Action has completed. If there is a `requirements.txt` file associated with the project, it must be in the Working Directory to be detected and used.

### Parameter: Command
This is the actual pytest command that will be run. The simplest command is just `pytest`, which will run all pytest modules found in the Working Directory. For a complete list of options please see the [pytest documentation](https://docs.pytest.org/en/6.2.x/usage.html).

### Parameter: JSON Report
This parameter allows for easy selection of Full or Summary JSON reports using module `pytest-json-report`. It is the equivalent of using `--json-report` (Full) or `--json-report-summary` (Summary) on the command line. If selected here, it is not necessary to add these arguments to the command. Making a selection here other than `none` will also publish the resulting JSON report to Kaholo Final Results for convenient access in the code layer.

### Parameter: Environment Variables
This parameter is a one-per-line list of KEY=VALUE pairs that will be made available within the docker container running pytest as environment variables. For example if the pytest includes these lines of code:

    huburl = os.environ["SELENIUM_HUBURL"]
    baseurl = os.environ["SELENIUM_BASEURL"]

Then the parameter "Environment Variables" should contain the value of those variables:

    SELENIUM_BASEURL=http://tfgrid-a.kaholodemo.net/petclinic
    SELENIUM_HUBURL=https://admin:2ry2HSi37ys@tfgrid-a.kaholodemo.net

If using the code layer, they may also be expressed in JSON. For example in a Kaholo Configuration:

    {
      "browser": "chrome",
      "envs" : {
          "SELENIUM_BASEURL": "http://tfgrid-a.kaholodemo.net/petclinic",
          "SELENIUM_HUBURL": "https://admin:2ry2HSi37ys@tfgrid-a.kaholodemo.net"
      }
    }

And after toggling the code switch on parameter "Environment Variables" one may then use this code:

    kaholo.execution.configuration.envs

### Parameter: Fail Action if Test Fails
If the Kaholo Action, and in turn potentially the pipeline should fail should any pytest test fail, or more precisely if pytest completes with a return value of 1 instead of 0, enable this parameter. Otherwise the Kaholo Action will simply report the pytest results, including a count of tests that failed and passed, and in Kaholo Executions the action will end with status `success`.

### Parameter: Python Docker Image
Every pytest project requires a specific Python version that is probably no the default specified in file `consts.json`. The plugin can not work properly with any arbitrary Python image. It is suggested to use the official python images found on [Docker Hub](https://hub.docker.com/_/python). For example `python:3.7.17`, `python:3.8.18`, or `python:3.10.13`. Selecting the precise version of python to use is essential.

Failing to specify the correct image or specifying none at all typically results in errors such these:

    ERROR: Ignored the following versions that require a different python version: 0.3.0 Requires-Python >=3.8; 23.7.0 Requires-Python >=3.8; 5.12.0 Requires-Python >=3.8.0; 6.80.0 Requires-Python >=3.8; 6.80.1 Requires-Python >=3.8; 6.81.0 Requires-Python >=3.8; 6.81.1 Requires-Python >=3.8; 6.81.2 Requires-Python >=3.8; 6.82.0 Requires-Python >=3.8; 6.82.1 Requires-Python >=3.8; 6.82.2 Requires-Python >=3.8; 6.82.3 Requires-Python >=3.8; 6.82.4 Requires-Python >=3.8; 6.82.5 Requires-Python >=3.8; 6.82.6 Requires-Python >=3.8; 6.82.7 Requires-Python >=3.8; 6.83.0 Requires-Python >=3.8; 6.83.1 Requires-Python >=3.8; 6.83.2 Requires-Python >=3.8; 6.84.0 Requires-Python >=3.8; 6.84.1 Requires-Python >=3.8; 6.84.2 Requires-Python >=3.8

In this case the errors suggest I should probably be using at least `python:3.8.0`. If the image is missing modules required to run the test, list the required modules in file `requirements.txt` in the "Working Directory" and the plugin will attempt to install them using `pip` before the `pytest` command is run.

An example requirements.txt looks like this:

    colorama==0.4.3
    mypy_extensions==0.4.3
    pip_api==0.0.30
    pylama==8.4.1
    requirementslib==3.0.0
    setuptools==45.2.0

It is also possible to specify any Docker image here, including custom images created from a Dockerfile using the [Kaholo Docker Plugin](https://github.com/Kaholo/kaholo-plugin-docker). If an image cannot be found to make the plugin work correctly for your `pytest` use case please do [let us know](https://kaholo.io/contact/).