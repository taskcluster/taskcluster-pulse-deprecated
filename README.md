TaskCluster - Pulse Integration
====================================

**DEPRECATED**, This project is now deprecated in favor of `taskcluster-try`.


This component will consume events from `pulse.mozilla.org` and post task-graphs
from the revisions to taskcluster.

For a task-graph to be publish from a push, it must pushed to a tree tracked by
this component and the pushed revision must contain a `taskgraph.yml` file in
the root.

