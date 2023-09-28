/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as main from '../src/main'
import * as utils from '../src/utils'

// Mock the GitHub Actions library
const infoMock = jest.spyOn(core, 'info')
const setFailedMock = jest.spyOn(core, 'setFailed')
const inputMock = jest.spyOn(core, 'getInput')
const execSpy = jest.spyOn(exec, 'exec')

const originalContext = github.context

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    inputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'changed_files':
          return JSON.stringify([
            './packages/pkg1/file1.css',
            './packages/pkgB/file2.tsx'
          ])
        default:
          return ''
      }
    })
    setFailedMock.mockImplementation(console.debug)
  })

  afterEach(() => {
    // Restore original @actions/github context
    Object.defineProperty(github, 'context', {
      value: originalContext
    })
  })

  it('completes when there is a changeset entry for every package', async () => {
    // Arrange
    jest.spyOn(utils, 'getChangesets').mockImplementation(
      async (): Promise<utils.Changesets> =>
        Promise.resolve({
          releases: [
            {
              name: '@owner/pkg1',
              type: 'patch'
            },
            {
              name: '@owner/pkgB',
              type: 'patch'
            }
          ]
        })
    )
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify({
          type: 'log',
          data: JSON.stringify({
            '@owner/pkg1': {
              location: './packages/pkg1'
            },
            '@owner/pkgB': {
              location: './packages/pkgB'
            }
          })
        }),
        stderr: '',
        exitCode: 0
      }))
      // check changeset installed
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 0
      }))
      // changeset info
      .mockImplementationOnce(async () => ({
        stdout: `🦋  info Packages to be bumped at patch:
        🦋  info 
        🦋  - @owner/pkg1
        🦋  ---
        🦋  info
        🦋  - @owner/pkgA
        🦋  - @owner/pkg2
        🦋  ---
        🦋  info
        🦋  - @owner/pkgB`,
        stderr: '',
        exitCode: 0
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(execSpy).not.toHaveBeenCalled()

    // Verify that all of the core library functions were called correctly
    expect(infoMock).toHaveBeenNthCalledWith(
      1,
      'Packages to verify: @owner/pkg1, @owner/pkgB'
    )
    expect(infoMock).toHaveBeenNthCalledWith(
      2,
      'All packages have changeset entries'
    )
  })

  it('installs changeset when not installed', async () => {
    // Arrange
    jest.spyOn(utils, 'getChangesets').mockImplementation(
      async (): Promise<utils.Changesets> =>
        Promise.resolve({
          releases: [
            {
              name: '@owner/pkg1',
              type: 'patch'
            },
            {
              name: '@owner/pkgB',
              type: 'patch'
            }
          ]
        })
    )
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify({
          type: 'log',
          data: JSON.stringify({
            '@owner/pkg1': {
              location: './packages/pkg1'
            },
            '@owner/pkgB': {
              location: './packages/pkgB'
            }
          })
        }),
        stderr: '',
        exitCode: 0
      }))
      // check changeset installed
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 1
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(execSpy).toHaveBeenCalledWith('yarn add @changesets/cli@latest -W')
  })

  it('fails when there are packages that need changeset entries', async () => {
    // Arrange
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify({
          type: 'log',
          data: JSON.stringify({
            '@owner/pkg1': {
              location: './packages/pkg1'
            },
            '@owner/pkgB': {
              location: './packages/pkgB'
            }
          })
        }),
        stderr: '',
        exitCode: 0
      }))
      // changeset installed
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 0
      }))
      // changeset info
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 1
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Changeset entry required for @owner/pkg1, @owner/pkgB because there have been changes since the last release.'
    )
  })

  it('skips without failure when there are no changed files', async () => {
    // Arrange
    inputMock.mockImplementationOnce(() => JSON.stringify([]))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalledWith('No changed files found. Skipping.')
  })

  it('skips without failure for release pr', async () => {
    // Arrange
    // Arrange
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              ref: 'changeset-release/main'
            }
          }
        }
      }
    })

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalledWith('Release PR detected. Skipping.')
  })

  it('skips without failure when there are no packages found for changed files', async () => {
    // Arrange
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify({
          type: 'log',
          data: JSON.stringify({
            '@owner/pkg3': {
              location: './packages/pkg3'
            },
            '@owner/pkgC': {
              location: './packages/pkgC'
            }
          })
        }),
        stderr: '',
        exitCode: 0
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()

    // Verify that all of the core library functions were called correctly
    expect(infoMock).toHaveBeenCalledWith('No packages to verify. Skipping.')
  })

  it('fails when workspaces CLI call fails', async () => {
    // Arrange
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: 'Oopsie!',
        exitCode: 1
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('fails when there is no base ref', async () => {
    // Arrange
    jest.spyOn(utils, 'getBaseAndHead').mockImplementation(() => [])
    Object.defineProperty(github, 'context', {
      value: {
        ...originalContext,
        eventName: 'oopsie',
        payload: {
          pull_request: {
            head: {
              sha: '1234567890'
            },
            base: {
              ref: 'main'
            }
          }
        }
      }
    })
    jest
      .spyOn(exec, 'getExecOutput')
      // workspaces info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify({
          type: 'log',
          data: JSON.stringify({
            '@owner/pkg1': {
              location: './packages/pkg1'
            },
            '@owner/pkgB': {
              location: './packages/pkgB'
            }
          })
        }),
        stderr: '',
        exitCode: 0
      }))
      // changeset installed
      .mockImplementationOnce(async () => ({
        stdout: '',
        stderr: '',
        exitCode: 0
      }))
      // changeset info
      .mockImplementationOnce(async () => ({
        stdout: JSON.stringify(`🦋  info Packages to be bumped at patch:
          🦋  info 
          🦋  - @owner/pkg1
          🦋  ---
          🦋  info
          🦋  - @owner/pkgA
          🦋  - @owner/pkg2
          🦋  ---
          🦋  info
          🦋  - @owner/pkgB`),
        stderr: '',
        exitCode: 0
      }))

    // Act
    await main.run()

    // Assert
    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith(
      `This action only supports pull requests and pushes, oopsie events are not supported. ` +
        "Please submit an issue on this action's GitHub repo if you believe this in correct."
    )
  })
})
