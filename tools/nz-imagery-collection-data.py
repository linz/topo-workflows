import datetime
import json
import os
import subprocess
import yaml
from dateutil import parser, tz

from typing import Dict, List, TypedDict, Union

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
        print(proc.stderr)
    return proc

def _get_scale():
    print("do stuff")

def _format_date(date: str) -> datetime:
    utc_tz = tz.gettz("UTC")
    nz_tz = tz.gettz("Pacific/Auckland")

    try:
        utc_time = parser.parse(date).replace(tzinfo=utc_tz)
    except parser.ParserError as err:
        raise Exception(f"Not a valid date: {err}") from err

    nz_time: datetime = utc_time.astimezone(nz_tz)
    return nz_time.strftime("%Y-%m-%d")

def _add_licensor(row: List[str], index: Dict[str, int]) -> Dict[str, str]:
    licensor = row[index["licensor"]]
    if ";" in licensor:
        return {"licensor-list": licensor, "licensor": ""}
    else:
        return {"licensor": licensor, "licensor-list": ""}

def _add_producer(row: List[str], index: Dict[str, int]) -> Dict[str, str]:
    producer = row[index["producer"]]
    if ";" in producer:
        return {"producer-list": producer, "producer": ""}
    else:
        return {"producer": producer, "producer-list": ""}

def _write_params(params: Dict[str, str], file: str) -> None:
    with open(f"./{file}.yaml", "w", encoding="utf-8") as output:
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
    return target.replace("s3://linz-imagery/", "s3://linz-workflow-artifacts/nz-imagery/")

## Uncomment if you need to retrieve the STAC files
# run_command(["git", "clone", """git@github.com:linz/imagery""", "./data/imagery-stac/"], None)
## Need to be logged into imagery account as no helper scripts
# run_command(["s5cmd", "cp", "s3://linz-imagery/catalog.json", "./data/imagery-stac/"], None)

CATALOG_FILE = "./data/imagery-stac/catalog.json"

with open(CATALOG_FILE, encoding="utf-8") as catalog:
     catalog_json = json.loads(catalog.read())

for link in catalog_json["links"]:
    if link["rel"] == "child":
        collection_link = os.path.abspath("./data/imagery-stac/" + link["href"])
        with open(collection_link, encoding="utf-8") as collection:
            collection_json = json.loads(collection.read())
            source = os.path.join("s3://linz-imagery/", link["href"].strip("./"))
            target = _tmp_target_edit(source)
            start_datetime = _format_date(collection_json["extent"]["temporal"]["interval"][0][0])
            end_datetime = _format_date(collection_json["extent"]["temporal"]["interval"][0][1])
            # scale = _get_scale(collection_json["links"])

            params = {
                "source": source,
                "target": target,
                "collection-id": collection_json["id"],
                "title": collection_json["title"],
                "description": collection_json["description"],
                "start-datetime": start_datetime,
                "end-datetime": end_datetime,
                # "scale": scale,
                "source-epsg": "2193",
                "target-epsg": "2193",
                "compression": "webp",
                "retile": "false",
                "validate": "true",
                "group": "5",
            }

            # print(params)

            # params = {**params, **_add_licensor(row, index)}
            # params = {**params, **_add_producer(row, index)}

            # file_name = link["href"].split("/")[-4:-2]
            # file_name = f"{file_name[0]}-{file_name[1]}"
            # formatted_file_name = file_name.replace("_", "-").replace(".", "-")



#            csv_writer.writerow([file_name, collection_json["id"], collection_json["title"], collection_json["description"], collection_json["providers"]])
# with open('collection_ids.csv', 'w', newline='') as csvfile:
#     csv_writer = csv.writer(csvfile, delimiter=',',
#                             quotechar='"', quoting=csv.QUOTE_MINIMAL)