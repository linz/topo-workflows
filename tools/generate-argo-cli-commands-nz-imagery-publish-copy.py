import json
import os
import subprocess
import yaml
from typing import Dict, List, Set, Union

CATALOG_FILE = "./data/imagery-stac/catalog.json"
COMMAND = "argo submit --from wftmpl/publish-copy -n argo -f ./{0}.yaml --generate-name {1}-\n"
VALID_SCALES: Set[str] = {"500", "1000", "2000", "5000", "10000", "50000"}


def _run_command(command: List[str], cwd: Union[str, None]) -> "subprocess.CompletedProcess[bytes]":
    try:
        proc = subprocess.run(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
    except subprocess.CalledProcessError as cpe:
        raise cpe
    if proc.stderr:
        data_errors.append(proc.stderr)
    return proc

def _is_valid_scale(links: List[Dict[str, str]]) -> bool:
    scales: List[str] = []
    for link in links:
        if link["rel"] == "item":
            try:
                scale = os.path.splitext(link["href"].split("_")[1])[0]
                if scale in VALID_SCALES:
                    if scale not in scales:
                        scales.append(scale)
                else:
                    return None
            except:
                return False
    if len(scales) != 1:
        return None
    return True

def _write_params(params: Dict[str, str], file: str) -> None:
    with open(f"./publish-{file}.yaml", "w", encoding="utf-8") as output:
        yaml.dump(
            params,
            output,
            default_flow_style=False,
            default_style='"',
            sort_keys=False,
            allow_unicode=True,
            width=1000,
        )

def _tmp_target_edit(target: str) -> str:
    if "2193/rgb" in target:
        target = target.replace("2193/rgb", "rgb/2193")
    return target.replace("s3://linz-imagery/", "s3://nz-imagery/")

## Uncomment if you need to retrieve the STAC files
# run_command(["git", "clone", """git@github.com:linz/imagery""", "./data/imagery-stac/"], None)
## Need to be logged into imagery account to get the catalog.json file
# run_command(["s5cmd", "cp", "s3://linz-imagery/catalog.json", "./data/imagery-stac/"], None)


with open(CATALOG_FILE, encoding="utf-8") as catalog:
     catalog_json = json.loads(catalog.read())

parameter_list = []

for link in catalog_json["links"]:
    if link["rel"] == "child":
        data_errors = []
        collection_link = os.path.abspath("./data/imagery-stac/" + link["href"])
        with open(collection_link, encoding="utf-8") as collection:
            collection_json = json.loads(collection.read())
            # TDE-854
            # north-island_20221122_10m← Sentinel-2 Cyclone Gabrielle imagery (can we reformat date in dirname?)
            # north-island_20230220_10m← Sentinel-2 Cyclone Gabrielle imagery (can we reformat date in dirname?)
            # north-island_2023_0-5m ← don’t want to rename
            # north-island_2023_10m ← do not copy
            if "north-island_2023_10m" in link["href"]:
                continue
            elif "north-island" in link["href"]:
                pass
            elif not _is_valid_scale(collection_json["links"]):
                continue
            source = os.path.join("s3://linz-imagery/", link["href"].strip("./")).rstrip("collection.json")
            target = _tmp_target_edit(source)

            params = {
                "source": source,
                "target": target,
                "include": ".tiff?$|.json$",
                "group": "1000",
                "group-size": "100Gi",
            }

            file_name = target.split("/")[-4:-2]
            file_name = f"{file_name[0]}-{file_name[1]}"
            formatted_file_name = file_name.replace("_", "-").replace(".", "-")

            parameter_list.append(COMMAND.format(formatted_file_name, formatted_file_name))

            _write_params(params, formatted_file_name)

    with open("./publish-copy.sh", "w") as script:
        script.write("#!/bin/bash\n\n")
        script.writelines(parameter_list)