# GitHub configuration

## General configuration

Pull requests should only allow the rebasing strategy.

## Action configuration

For permissions read and write access is required. GitHub actions also need to be able to create PR requests.

## Main branch protection

Should have the following properties on the main branch:

- Require a pull request before merging
- Prevent merge commits
- Prevent force pushing for everyone but me
