# 📦🦋 Changeset Per Package 🦋📦

![Test Coverage](badges/coverage.svg)
[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)

This action validates that there is a changeset entry for each package that has
been changed for a given list of files. It is intended to be used in a workflow
with other actions from the [Khan/actions](https://github.com/Khan/actions)
repo.

## When Making Changes

Please run `yarn all` to ensure that it builds and that all tests pass.

This action is dogfooded in the workflow for this repo. See
[`ci.yml`](./.github/workflows/ci.yml). That way, you can test the behavior of
your changes by opening a PR.

## Usage

You can create version tag(s) that developers can use to reference different
stable versions of your action. For more information, see
[Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
in the GitHub Actions toolkit.

To include the action in a workflow in another repository, you can use the
`uses` syntax with the `@` symbol to reference a specific branch, tag, or commit
hash.

```yaml
steps:
  - name: Checkout with history
    uses: actions/checkout@v4
    with:
      fetch-depth: 0 # This is necessary! Checks out the history so that we can
                     # get the changset entries diff.

  - name: Get changed files
    uses: Khan/actions@get-changed-files-v1
    id: changed

  - name: Filter out files that don't need changeset
    uses: Khan/actions@filter-files-v0
    id: match
    with:
      changed-files: ${{ steps.changed.outputs.files }}
      files: packages/
      globs: "!(**/__tests__/**), !(**/__mocks__/**)"
      matchAllGlobs: true
      conjunctive: true

  - name: Verify changeset entries
    uses: Khan/changeset-per-package@v1.0.0
    with:
      changed_files: ${{ steps.match.outputs.filtered }}
```
