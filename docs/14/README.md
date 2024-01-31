# Knut plugin architecture

Plugins allow for third parties to add new features. This includes things like ways the following things: publish, view, indexing, and searching.

Here is the loading sequence when _knut_ first loads

- Load storage
- Load plugins
- Load kegs

## Key facts

- Plugin will need to be initiated when loaded into either _knut_ or _keg_ context.

  A plugin may need to hold state in between running various hooks

- Plugin should not require the _knut_ context as a Keg may use the plugin as well
- Plugin should be able to add an index to a _keg_
- Plugin should be able to add an index to the _knut_
- Plugin should be able to add a search to a _keg_
- Plugin should be able to add an search to _knut_
- Plugin may add a new search method
