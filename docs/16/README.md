# Configuration management for knut

The configuration strategy that will be employed is to have 4 separate places to keep configuration. This includes:

- Keg specific

  Configuration that is specific to that keg. It lives right next to the documents

- User config

  User configuration is where the user keeps global configuration. This will store things like defaults to use.

- Data config

  Data configuration is similar to the users configuration. However, this is intended to be handled by third party applications.

- Cache

  Cache is where cache date may be stored.

The location of these files vary by OS.

## Individual keg configuration

Every KEG has a file called _keg_. This will hold keg specific configuration for indexes, publishers, search functions, and viewers. Typically, a keg CLI will keep its global configuration in user config, data, and cache.

## Global keg configuration

## Managing configuration

- `knut keg var`

  Used to manage cache variables for `knut keg var`. See `knut var help` for more details. This should be identical to `keg var`

- `knut keg config`

  Used to manage cache variables for `knut keg`. See `knut var help` for more details. This should be identical to `keg config`

- `knut var`

  Used to manage cache variables for `knut`. See `knut var help` for more details.

- `knut config`

  Used to manage user configuration for `knut`. See `knut config help` for more details.
