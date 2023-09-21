import type { Context } from '@actions/github/lib/context'

export const getBaseAndHead = (context: Context): string[] => {
  switch (context.eventName) {
    case 'pull_request_target':
    case 'pull_request':
      return [
        context.payload.pull_request?.base?.sha,
        context.payload.pull_request?.head?.sha
      ]
    case 'push':
      return [context.payload.before, context.payload.after]
  }
  return []
}
