# Knut plugin architecture

A plugin allows adding event handlers on knut. Not to be confused with a keg plugin.

Plugins allow for third parties to add new features. This includes things like ways the following things: publish, update, node CRUD operations, viewing, indexing, and searching on a keg. It could also allow for doing things on specific Knut actions such as global search, and new keg,

Keg operations

- `publish`

  Allow a keg to publish its contents some where. For example this could be up on GitHub

- `update`

  This could be things on how to update the keg. For example, this could pull in configured kegs from keg. It could also run the generations functions on the keg.

- `configure`

  Configuration management for the plugin itself

- `indexing`

  Add custom indexing behavior

- `searching`

  Add custom searching behavior

Here is the loading sequence when _knut_ first loads

- Load storage
- Load plugins
- Load kegs

Knut operations

- `new keg`
- `global search`

## Plugin management

Plugins should be able to be global enabled/disabled in the Knut `config.yaml` file.

## Key facts

- Plugin will need to be initiated when loaded into either _knut_ or _keg_ context.

  A plugin may need to hold state in between running various hooks

- Plugin should not require the _knut_ context as a Keg may use the plugin as well
- Plugin should be able to add an index to a _keg_
- Plugin should be able to add an index to the _knut_
- Plugin should be able to add a search to a _keg_
- Plugin should be able to add an search to _knut_
- Plugin may add a new search method

## Keg plugin loading

A Keg may only configure a plugin.

- Global keg plugins

  A plugin loader will look at what global plugins are enabled. Enabled plugins here will be used when creating new kegs

- Local Keg plugins

  A Keg
  These will override the global configurations

## Knut plugins

## Configuration structure

In data directory

In config directory

- config.yaml
- kegs
  - `[keg name]`
    - config.yaml

## Quick start

```sh
mkdir -p ~/.config/keg
knut keg setup --dump-config > ~/.config/keg/config.yaml
```
