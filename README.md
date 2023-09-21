# 📦🦋 Changeset Per Package 🦋📦

![Test Coverage](badges/coverage.svg)
[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)

This action validates that there is a changeset entry for each package that has
been changed.

This repository has two action files:

| File                                         | Description                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`./action.yml`](./action.yml)               | This composite action calls on other Khan actions to prepare a list of changed files.                                                                                                     |
| [`./verify/action.yml`](./verify/action.yml) | This ts action contains its logic to [`./src/main.ts`](./src/main.ts). It checks for packages corresponding to changed files, then determines if there is a match for each in changesets. |

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
  - name: Checkout
    id: checkout
    uses: actions/checkout@v3

  - name: Verify Changeset Per Package
    id: changeset-per-package
    uses: Khan/changeset-per-package@v0.0.0 # Commit with the `v1` tag
```
