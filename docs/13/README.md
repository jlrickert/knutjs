# Managing chronological information with index

Indexes may be automatically generated based on nodes with certain meta data. For example, a daily entry may have a tag of _daily_ and _date_ in (Y-m-D) format. Nodes that meet the criteria for being index will have its entry included in the index. An entry is a list item that includes the date, and title that links to a node. Here is an example index node.

```md
# Daily index

This is an example summary.

## Index

- 2023-12-19 [Tuesday December 19 2023 daily entry](../814)
- 2023-12-18 [Monday December 18 2023 daily entry](../809)
- 2023-12-17 [Sunday December 17 2023 daily entry](../808)
```

This file is specified in the keg file in the indexes section. Here is an example snippet from a keg file.

```yaml
indexes:
  - file: dex/changes.md
    summary: latest changes
  - file: dex/nodes.tsv
    summary: all nodes by id
  - file: dex/daily.md
    summary: All daily log entries
    hooks:
      index:
        tags:
          - daily
  - file: dex/sourdough-baking.md
    summary: All daily log entries
    hooks:
      index:
        tags:
          - baking
          - sourdough
  - file: dex/baking.md
    summary: All daily log entries
    hooks:
      index:
        tags:
          - baking
```

This will tell knut to update the indexes on node changes.

- [ ] TODO: implement automatic indexing based on metadata criteria

## Meta

    tags: #todo
