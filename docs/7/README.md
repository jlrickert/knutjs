# Knut CLI usage

## `knut index`

Managing knut indexes

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
