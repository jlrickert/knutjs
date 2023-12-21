# What is a keg

A way to think about a KEG (knowledge exchange graph) is a database of information. It consists of unique nodes of contextually isolated units of information. These nodes will often times have connections to other nodes. This format allows for capturing bits of knowledge and finding connections between them. The benefit is an organized way of documenting things organically as they come with minimal disruption during editing.

## Structure of a keg

The typical structure of a KEG will have a **keg file**, a **dex** directory, and many directories that represent a unique node. The keg file provides basic meta information about the keg. The dex directory is a special node that contains a last changed index and nodes.tsv file. It is automatically kept up to date but Knut. A node is any directory that contains a README.md file that follows the KEGML spec. It is a simplified GitHub flavored markdown. It may also contain an optional meta.yaml file that contains meta information.

See the [keg specification](../11) for more details.
