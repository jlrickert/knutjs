# Knowledge Utils (Knut)

Knut is a knowledge management utilities for managing a second brain. It is based around managing KEGs. For more information see [What is Knut](docs/1).

## Apps and Packages

- `@jlrickert/knutjs-cli`: main CLI for Knut
- `@jlrickert/knutjs-core`: core Knut library
- `@jlrickert/knutjs-tsconfig`: shared `tsconfig.json`s used throughout the monorepo

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

## Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## Useful commands

- `pnpm run build` - Build all packages and the docs site
- `pnpm run dev` - Develop all packages and the docs site
- `pnpm run lint` - Lint all packages
- `pnpm run changeset` - Generate a changeset
- `pnpm run clean` - Clean up all `node_modules` and `dist` folders (runs each package's clean script)

## Versioning and Publishing packages

Package publishing has been configured using [Changesets](https://github.com/changesets/changesets). Please review their [documentation](https://github.com/changesets/changesets#documentation) to familiarize yourself with the workflow.

This example comes with automated npm releases setup in a [GitHub Action](https://github.com/changesets/action). To get this working, you will need to create an `NPM_TOKEN` and `GITHUB_TOKEN` in your repository settings. You should also install the [Changesets bot](https://github.com/apps/changeset-bot) on your GitHub repository as well.

For more information about this automation, refer to the official [changesets documentation](https://github.com/changesets/changesets/blob/main/docs/automating-changesets.md)

## Contributing

See [Contributing guide](docs/3) for more information.

## GitHub Package Registry

See [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#publishing-a-package-using-publishconfig-in-the-packagejson-file)
