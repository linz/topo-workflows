# Tools

This folder contains single use scripts which have been used to assist in various argo tasks.  
The scripts should be stored in this folder if they may become useful again in the future.

## generate-argo-commands-imagery.py

**Date:** 14/02/2023

**Related Jira Tickets:** [TDE-632](https://toitutewhenua.atlassian.net/jira/software/c/projects/TDE/boards/768/backlog?atlOrigin=eyJpIjoiNjVkNmMyNmNmNGJlNDIzOGI2YmIyMzViNzVkNDUwZjEiLCJwIjoiaiJ9); [TDE-631](https://toitutewhenua.atlassian.net/browse/TDE-631?atlOrigin=eyJpIjoiNDI5OGE5MGY5ZmUxNGUyNzkwZjdlYTcxOTg5ZmQ0MGUiLCJwIjoiaiJ9)

**Description:**  
This script sets up for the automated processing of numerous imagery datasets using the argo cli.

**Setup:**

Download the [parameters csv](https://linzsrm.sharepoint.com/:x:/r/sites/Topography/_layouts/15/Doc.aspx?sourcedoc=%7B508567E2-EF88-458B-9115-0FC719CAA540%7D&file=imagery-standardising-parameters-bulk-process.xlsx&action=default&mobileredirect=true) from sharepoint, store as `imagery-standardising-parameters-bulk-process.csv` in `./tools/`  
 _nb: you will have to convert this from xlsx to csv, this can be done many places [online](https://cloudconvert.com/xlsx-to-csv)._

**Instructions:**

1. If necessary, update the `SOURCE` variable in generate-argo-cli-commands.py
2. Run:

```bash
cd ./tools
python3 generate-argo-cli-commands.py > log.txt
```

**Output:**

- **region-year-scale.yaml:** workflow parameters for this dataset
- **standardise-publish.sh:** bash script to 'deploy' argo workflows
- **standardise-publish-import.sh:** bash script to 'deploy' argo workflows that also require basemaps import
- **logs.txt:** Contains important logs about skipped datasets.

**Submitting:**  
`standardise-publish.sh` is set up and ready to go, just run:

```bash
sh standardise-publish.sh
```

If created, `standardise-publish-import.sh` will require you to uncomment some lines in `standardise-publish-import.yaml`, then run:

```bash
sh standardise-publish-import.sh
```
