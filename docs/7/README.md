# Knut cli usage

## `knut index`

Managing indexes

## `knut search`

Knowledge searching.

Flags:

- interactive
- model

  This could be either classic or openai. Defaults to classic.

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

## `knut publish`

This will run some sort of publish hook. For now this will just add everything to git and will push everything up to git.

## `knut link <node_id>`

`knut link <node_id>` will push a copy of the node up to the web and return a unique URL for the node.
