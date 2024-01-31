# Fuse search plugin

Fuse works by loading in all the keg nodes into memory. This is requirement. An index is also required. The index could be reused from a previous search or fuse will build a new one.

| Option  | Type              | Comment                |
| ------- | ----------------- | ---------------------- |
| summary | string (Optional) | The summary to display |
| name    | 'fuse' (Required) | name of the pluggin    |

- Load plugin

  Nothing to do here

- On search for multiple kegs

  This will look to see if there is an index available in the _knut_ cache. If not found it will simply update on _knut_ context.
