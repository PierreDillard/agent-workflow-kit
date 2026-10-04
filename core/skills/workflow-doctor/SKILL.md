---
name: workflow-doctor
description: Run the installed workflow's read-only health check after installation or workflow changes.
---

# Workflow Doctor

Run `.claude/scripts/workflow-doctor.sh` and report its output as-is.

An exit code other than zero means the workflow is not trustworthy. State each failure and its
suggested repair; never fix it silently. The doctor itself must never create, edit, delete or stage
project files.
