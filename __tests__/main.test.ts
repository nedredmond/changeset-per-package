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

// Mock the GitHub Actions core library
const infoMock = jest.spyOn(core, 'info')
const setFailedMock = jest.spyOn(core, 'setFailed')
const getInputMock = jest
  .spyOn(core, 'getInput')
  .mockImplementation((name: string): string => {
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

const getExecOutputMock = jest.spyOn(exec, 'getExecOutput')

const originalContext = github.context

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original @actions/github context
    Object.defineProperty(github, 'context', {
      value: originalContext
    })
  })

  it('completes when there is a changeset entry for every package', async () => {
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
    getExecOutputMock
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

  it('fails when there is no base refere', async () => {
    // Arrange
    const getBaseAndHeadMock = jest
      .spyOn(utils, 'getBaseAndHead')
      .mockImplementation(() => [undefined, undefined])
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
    getExecOutputMock
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

  it('fails when there is no base refere', async () => {
    // Arrange
    const getBaseAndHeadMock = jest
      .spyOn(utils, 'getBaseAndHead')
      .mockImplementation(() => [undefined, undefined])
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
    getExecOutputMock
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

  // it('sets a failed status', async () => {
  //   // Set the action's inputs as return values from core.getInput()
  //   getInputMock.mockImplementation((name: string): string => {
  //     switch (name) {
  //       case 'milliseconds':
  //         return 'this is not a number'
  //       default:
  //         return ''
  //     }
  //   })

  //   await main.run()
  //   expect(runMock).toHaveReturned()

  //   // Verify that all of the core library functions were called correctly
  //   expect(setFailedMock).toHaveBeenNthCalledWith(
  //     1,
  //     'milliseconds not a number'
  //   )
  // })
})
