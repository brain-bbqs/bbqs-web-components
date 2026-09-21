# Changesets

Every package here is versioned independently. A pull request that changes a package's published
surface adds a changeset describing it:

```sh
npx changeset
```

Pick the packages touched and whether each change is a patch, minor or major. The file it writes
under this directory is committed with the change. On `main`, the release workflow turns pending
changesets into a "Version Packages" pull request that bumps versions, rewrites each package's
`CHANGELOG.md`, and, once merged, publishes to npm.
