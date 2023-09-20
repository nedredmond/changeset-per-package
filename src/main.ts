import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { getBaseAndHead } from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const { context } = github

    const changedFiles = JSON.parse(core.getInput('changed_files'))

    if (!changedFiles.length) {
      // no relevant files changed, ignore
      return
    }

    if (context.payload?.pull_request?.head.ref === 'changeset-release/main') {
      return // release PRs don't need changesets.
    }

    const packageNames = new Set<string>()

    // relies on the repo having yarn...
    //   a future enhancement would be to determine the package manager and use that
    const { stdout: workspacesJson, stderr: workspacesErr } =
      await exec.getExecOutput(`yarn workspaces --json info`)

    if (workspacesErr) {
      core.setFailed(workspacesErr)
    }

    const workspacesInfo = JSON.parse(JSON.parse(workspacesJson).data)
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
      core.info('No packages to verify')
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
    const { stdout: changesetOutput, stderr: changesetErr } =
      await exec.getExecOutput(`yarn changeset status --since ${base}`)

    if (changesetErr) {
      core.setFailed(changesetErr)
    }
    if (!changesetOutput) {
      core.setFailed(
        `Changeset entries are required for the following packages: ${packageNamesArray.join(
          ', '
        )}`
      )
    }

    const changesetEntries = changesetOutput
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('🦋  - '))
      .map((line: string) => line.replace('🦋  - ', ''))

    const changesetEntriesNeeded = packageNamesArray.filter(
      packageName => !changesetEntries.includes(packageName)
    )

    if (changesetEntriesNeeded.length) {
      core.setFailed(
        `Changeset entry required for ${changesetEntriesNeeded.join(
          ', '
        )} because there have been changes since the last release.`
      )
    }

    core.info('All packages have changeset entries')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
