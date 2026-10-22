---
name: workflow-doctor
description: Run the installed workflow's read-only health check after installation or workflow changes. Use after installing or updating the kit, after editing any skill, on a new clone or machine, or when the user says "doctor" or "check the workflow".
---

# Workflow Doctor

Run `{{KIT_DIR}}/scripts/workflow-doctor.sh` and report its output as-is.

An exit code other than zero means the workflow is not trustworthy. State each failure and its
suggested repair; never fix it silently. The doctor itself must never create, edit, delete or stage
project files.
