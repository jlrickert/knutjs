# Deployment strategy

Deployments should be relatively automated. Development work is done in the dev branch. At some point a release branch will be created. Once it is finalized it should be merged into the main branch.

Requirements for the merging into the main branch

- Versions for each changed package to be updated according to [conventional commits]
- CHANGELOG.md to be updated.
- Merge strategy should be a rebase

[conventional commits]: https://www.conventionalcommits.org/en/v2.0.0/
