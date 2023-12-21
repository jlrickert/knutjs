# Release strategy

The typical flow creating a release is as follows

Every time commits are pushed over to main a GitHub action will run. This will create a pull request and branch named `changeset-release/main`. The branch is effectively the main branch with the changes made by running `changeset version`. On merging the created PR the version changes will be detected and the effected packages will be released accordingly.
