import type { Context } from '@actions/github/lib/context'
import * as fs from 'fs/promises'

export const getBaseAndHead = (context: Context): string[] => {
  switch (context.eventName) {
    case 'pull_request_target':
    case 'pull_request':
      return [
        context.payload.pull_request?.base?.ref,
        context.payload.pull_request?.head?.sha
      ]
    case 'push':
      return [context.payload.before, context.payload.after]
  }
  return []
}

type Release = {
  name: string
  type: 'major' | 'minor' | 'patch'
  oldVersion?: string
  changeSets?: string[]
}

export type Changesets = {
  releases: Release[]
}

export const getChangesets = async (path: string): Promise<Changesets> => {
  const changesetsFile = await fs.readFile(path, 'utf8')
  return JSON.parse(changesetsFile) as Changesets
}
