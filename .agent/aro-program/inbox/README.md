# Patch inbox
Drop `*.patch` files (from `git format-patch`) here, in order (`0001-...`). At the start of a
session the agent applies them with `git am --3way` and moves each to `applied/`.
If one fails it stops and reports; it never edits a patch.
