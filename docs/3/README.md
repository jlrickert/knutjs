# Contributing guide

Guidelines on how to successfully contribute to the code base.

## Environment setup

## Running tests

You can run the tests of the project that you modified by going to the project's directory and running:

```shell
pnpm test
```

Alternatively, you can run it from anywhere by specifying the name of the project using the `--filter` option:

```shell
pnpm --filter core test
```

If you want to pass options to Vite, use the `pnpm run test` command and append any needed options. For instance, if you want to run a single test in a single file, run:

```shell
pnpm --filter core run test test/lockfile.ts -t "lockfile has dev deps even when installing for prod only"
```

## Coding style

See [coding style guide](../2)

## Submitting a Pull Request (PR)

Before you submit your Pull Request (PR) consider the following guidelines:

- Search [GitHub](https://github.com/pnpm/pnpm/pulls) for an open or closed PR that relates to your submission. You don't want to duplicate effort.
- Make your changes in a new git branch:

  ```shell
  git checkout -b my-fix-branch main
  ```

- Create your patch, following [code style guidelines](../2), and **including appropriate test cases**.
- Run `pnpm changeset` in the root of the repository and describe your changes. The resulting files should be committed as they will be used during release.
- Run the full test suite and ensure that all tests pass.
- Commit your changes using a descriptive commit message that follows our [commit message conventions](../9). Adherence to these conventions is necessary because release notes are automatically generated from these messages.

  ```shell
  git commit -a
  ```

  Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files.

- Push your branch to GitHub:

  ```shell
  git push origin my-fix-branch
  ```

- In GitHub, send a pull request to `knutjs:main`.
- If we suggest changes then:

  - Make the required updates.
  - Re-run the test suites to ensure tests are still passing.
  - Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

    ```shell
    git rebase main -i
    git push -f
    ```

That's it! Thank you for your contribution!

### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes from the main (upstream) repository:

- Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

  ```shell
  git push origin --delete my-fix-branch
  ```

- Check out the main branch:

  ```shell
  git checkout main -f
  ```

- Delete the local branch:

  ```shell
  git branch -D my-fix-branch
  ```

- Update your main with the latest upstream version:

  ```shell
  git pull --ff upstream main
  ```
