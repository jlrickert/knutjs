# Knut CLI usage

## `knut index`

Managing Knut indexes

## `knut keg index [...kegalias]`

Update all indexes for all kegs

## `knut keg create <kegalias> <title>`

Create a node

Flags:

- tags: string[]

  Tags to add

## `knut keg index [...kegalias]`

Update index for kegs

## `knut search <query>`

Search selected keg nodes that matches the query

Flags:

- i, interactive: boolean
- m, model: openai | classic

  This could be either classic or openai. Defaults to classic.

- r, json

  Print to console as raw json

- t, tags: string[]

  tags to filter against. Current just use AND.

## `knut node`

Creating and managing nodes

### `knut node create [template]`

Create a new node. The --edit (-e for short) flag should open it in an editor of choice. Editor choice is selected by the following configuration preference from most to least:

- VISUAL
- EDITOR
- neovim
- vim
- vscode
- nano
- vi

### `knut node edit`

## `knut config`

Configuration management

## `knut publish <kegalias>`

This will run some sort of publish hook. For now this will just add everything to git and will push everything up to git.

## `knut link <kegalias> <node_id>`

`knut link <node_id>` will push a copy of the node up to the web and return a unique URL for the node.

## `knut help`

Print help

- `knut`

  Displays help

## Example cheat sheet

| Command                     | Comment                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `knut`                      | displays help                                                                                         |
| `knut help`                 | displays help                                                                                         |
| `knut newkeg <name>`        | creates keg with <name>                                                                               |
| `knut keg`                  | displays help for keg commands. should work like keg when in a keg directory plus a few extra goodies |
| `knut keg pub`              | displays help for keg commands on keg pub                                                             |
| `knut keg pub publish`      | publish the keg pub                                                                                   |
| `knut keg pub index update` | update indexes                                                                                        |
| `knut keg pub gen update`   | run generators                                                                                        |
| `knut keg pub conf`         | manage specific config for keg                                                                        |
| `knut keg pub create`       | create new node on keg pub                                                                            |
| `knut keg pub 23`           | edit node 23 on keg pub. must be a number                                                             |
| `knut keg pub grep xyx`     | search keg pub using grep                                                                             |
| `knut keg pub search zyx`   | search keg pub using default search engine                                                            |
| `knut search xyz`           | search all kegs                                                                                       |
| `knut config set a b`       | sets a to equal b in config                                                                           |
| `knut config set a.b c`     | sets `{ a: { b: c } }`                                                                                |
| `knut setup`                | various setup helpers                                                                                 |
