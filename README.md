# Kaholo pytest Plugin
Documentation not written yet.

## Use of Docker
This plugin relies on the [official Docker image](https://hub.docker.com/_/maven) "maven" to run the Maven command, `mvn`. This has many upsides but a few downsides as well of which the user should be aware.

If running your own Kaholo agents in a custom environment, you will have to ensure docker is installed and running on the agent and has sufficient privilege to retrieve the image and start a container. If the agent is already running in a container (kubernetes or docker) then this means a docker container running within another container.

The first time the plugin is used on each agent, docker may spend a minute or two downloading the image. After that the delay of starting up another docker image each time is quite small, a second or two. Method "Get Maven Version" is a quick and simple way to force the image to download and/or test if the image is already cached locally on the Kaholo agent.

Next, because the CLI is running inside a docker container, it will not have access to the complete filesystem on the Kaholo agent. Parameter "Working Directory" is particularly important for this. Suppose on the agent you have a repository cloned at location `/home/myproject/myapp`, and you wish to `mvn package` this project. This means your Maven Project Object Model or POM (`pom.xml`) is located at `/home/myproject/myapp/pom.xml`. This will be found if your working directory is `/home/myproject/myapp` and your command is `mvn package`. Any files outside of `/home/myproject/myapp` will not be accessible within the docker image running the `mvn` command. Alternatively you could make Working Directory `/home/myproject` and the Command `mvn package -f myapp/pom.xml`. In this case files outside of `myapp` are reachable, but only if they are elsewhere within `/home/myproject`.

The docker container is destroyed once the command has successfully run, so output files will also be destroyed, apart from those within your working directory. This includes the maven cache typically located at `~/.m2`. Every build must therefore download all dependencies every time. For large builds without (for example) a local cache service or local Nexus proxy this may become unacceptably slow. If you would like us to improve the plugin to handle this some other way, please [let us know](https://kaholo.io/contact/).

Should these limitations negatively impact on your use case, Maven can be installed on the agent and run via the Command Line plugin instead. A main purpose for this plugin is to help you avoid that inconvenience.

## Plugin Installation
For download, installation, upgrade, downgrade and troubleshooting of plugins in general, see [INSTALL.md](./INSTALL.md).

## Method: Get Maven Version
This method does a trivial test of the Maven plugin to confirm that the docker image can be pulled and a Maven command successfully run, in this case `mvn --version`. Use this method only to confirm the plugin and Kaholo agent are working as designed and ready to execute your Maven commands.

## Method: Run Maven Command
This method run any command that begins with `mvn`, for example `mvn package`. To run commands that do NOT start with `mvn`, see the [Command Line plugin](https://github.com/Kaholo/kaholo-plugin-cmd) instead.

### Parameters
* Working Directory - a path within which the project requiring building exists. This is typically a repository cloned to the agent using the [Git Plugin](https://github.com/Kaholo/kaholo-plugin-git) earlier in the pipeline. It is simplest if this directory contains the main pom.xml. Only files within this directory will be available to the maven command.