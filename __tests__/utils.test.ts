import { getBaseAndHead } from '../src/utils'
import { Context } from '@actions/github/lib/context'

const contextData: Context = {
  payload: {},
  eventName: '',
  sha: '',
  ref: '',
  workflow: '',
  action: '',
  actor: '',
  job: '',
  runNumber: 0,
  runId: 0,
  apiUrl: '',
  serverUrl: '',
  graphqlUrl: '',
  // the following are actually getters
  issue: {
    owner: '',
    repo: '',
    number: 0
  },
  repo: {
    owner: '',
    repo: ''
  }
}

describe('utils', () => {
  describe('getBaseAndHead', () => {
    it('returns for event name "pull_request_target"', () => {
      const context: Context = {
        ...contextData,
        eventName: 'pull_request_target',
        payload: {
          pull_request: {
            base: {
              ref: 'refs/heads/master'
            },
            head: {
              sha: 'sha1'
            },
            number: 1
          }
        },
        // need these again because they are getters
        issue: {
          owner: '',
          repo: '',
          number: 0
        },
        repo: {
          owner: '',
          repo: ''
        }
      }
      expect(getBaseAndHead(context)).toEqual(['refs/heads/master', 'sha1'])
    })
    it('returns for event name "pull_request"', () => {
      const context: Context = {
        ...contextData,
        eventName: 'pull_request',
        payload: {
          pull_request: {
            base: {
              ref: 'refs/heads/master'
            },
            head: {
              sha: 'sha1'
            },
            number: 1
          }
        },
        // need these again because they are getters
        issue: {
          owner: '',
          repo: '',
          number: 0
        },
        repo: {
          owner: '',
          repo: ''
        }
      }
      expect(getBaseAndHead(context)).toEqual(['refs/heads/master', 'sha1'])
    })
    it('returns for event name "push"', () => {
      const context: Context = {
        ...contextData,
        eventName: 'push',
        payload: {
          before: 'sha0',
          after: 'sha1'
        },
        // need these again because they are getters
        issue: {
          owner: '',
          repo: '',
          number: 0
        },
        repo: {
          owner: '',
          repo: ''
        }
      }
      expect(getBaseAndHead(context)).toEqual(['sha0', 'sha1'])
    })
    it('returns empty for other event names', () => {
      const context: Context = {
        ...contextData,
        eventName: 'whatever',
        payload: {
          before: 'sha0',
          after: 'sha1',
          pull_request: {
            base: {
              ref: 'refs/heads/master'
            },
            head: {
              sha: 'sha1'
            },
            number: 1
          }
        },
        // need these again because they are getters
        issue: {
          owner: '',
          repo: '',
          number: 0
        },
        repo: {
          owner: '',
          repo: ''
        }
      }
      expect(getBaseAndHead(context)).toEqual([])
    })
  })
})
