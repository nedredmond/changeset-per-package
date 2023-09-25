import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { getBaseAndHead, getChangesets } from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const { context } = github

    const changedFiles = JSON.parse(core.getInput('changed_files'))

    if (!changedFiles.length) {
      core.info('No changed files found. Skipping.')
      return
    }

    if (
      (context.payload?.pull_request?.head.ref as string)?.startsWith(
        'changeset-release'
      )
    ) {
      core.info('Release PR detected. Skipping.')
      return
    }

    const packageNames = new Set<string>()

    // relies on the repo having yarn...
    //   a future enhancement would be to determine the package manager and use that
    const workspacesResult = await exec.getExecOutput(
      `yarn workspaces --json info`
    )

    const workspacesInfo = JSON.parse(JSON.parse(workspacesResult.stdout).data)
    const workspaces = Object.keys(workspacesInfo).map(name => ({
      name,
      ...workspacesInfo[name]
    }))
    // get packages in changed directories
    iterFiles: for (const file of changedFiles) {
      // remove file name from path
      const rawDir = file.replace(/[^/]+$/, '')
      const parts = rawDir.split('/').filter(Boolean)
      // traverse backwards to start at the deepest directory
      for (let i = parts.length - 1; i >= 0; i--) {
        const directory = parts.slice(0, i + 1).join('/')
        const packageInfo = workspaces.find(
          ({ location }) => location === directory
        )
        if (packageInfo) {
          packageNames.add(packageInfo.name)
          continue iterFiles
        }
      }
      // no package.json found, skip
    }

    const packageNamesArray = Array.from(packageNames)
    if (!packageNames.size) {
      core.info('No packages to verify. Skipping.')
      return
    }
    core.info(`Packages to verify: ${packageNamesArray.join(', ')}`)

    const [base] = getBaseAndHead(context)
    if (!base) {
      core.setFailed(
        `This action only supports pull requests and pushes, ${context.eventName} events are not supported. ` +
          "Please submit an issue on this action's GitHub repo if you believe this in correct."
      )
      return
    }

    // right now, the only way to access JSON output is to create a file,
    //   so we are just going to work with the pretty-printed output
    const filePath = `${github.context.runId}.json`
    await exec.exec(`yarn add @changesets/cli@latest -W`)
    const changesetResult = await exec.getExecOutput(
      `yarn changeset status --since origin/${base} --output ${filePath}`,
      undefined,
      { ignoreReturnCode: true }
    )

    if (changesetResult.exitCode === 1) {
      core.debug(
        `Changeset status failed; that could mean there is no changeset file, or that there was an error.`
      )
    }

    // parse out the package names from the pretty-printed changeset output
    let changesetEntries: string[] = []
    if (changesetResult.exitCode !== 1) {
      const changesets = await getChangesets(filePath)
      changesetEntries = changesets.releases.map(release => release.name)
    }

    const changesetEntriesNeeded = packageNamesArray.filter(
      packageName => !changesetEntries.includes(packageName)
    )

    if (changesetEntriesNeeded.length) {
      core.setFailed(
        `Changeset entry required for ${changesetEntriesNeeded.join(
          ', '
        )} because there have been changes since the last release.`
      )
      return
    }

    core.info('All packages have changeset entries')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
