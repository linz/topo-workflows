import csv
from typing import List, Dict, Tuple
import yaml

PARAMETERS_CSV = "./data/elevation-31-07-23.csv"

COMMAND = "argo submit workflows/raster/standardising-publish-import.yaml -n argo -f ./{0}.yaml --generate-name {1}\n"


def _index_csv(header: List[str]) -> Dict[str, int]:
    ind = {}
    ind["comments"] = header.index("Comments")
    ind["title"] = header.index("title")
    ind["licensor"] = header.index("licensor")
    ind["producer"] = header.index("producer")
    ind["startdate"] = header.index("start-datetime")
    ind["enddate"] = header.index("end-datetime")
    ind["verticalEPSG"] = header.index("vertical-datum")
    ind["horizontalEPSG"] = header.index("horizontal-datum")
    ind["source"] = header.index("source")
    ind["target"] = header.index("target")
    ind["inputscale"] = header.index("input-scale")
    ind["outputscale"] = header.index("output-scale")
    ind["description"] = header.index("description")
    return ind


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


def _valid_params(params: Dict[str, str]) -> Tuple[bool, str]:
    if params["comments"] != "":
        return (False, params["comments"])
    for param in params:
        if "TODO" in params[param]:
            return (False, "TODO Noted")
    return (True, "")

def _tmp_target_edit(target: str) -> str:
    return target.replace("s3://linz-elevation/", "s3://linz-workflows-scratch/linz-elevation/")


with open(PARAMETERS_CSV, "r") as csv_file:
    reader = csv.reader(csv_file)
    header = next(reader)
    index = _index_csv(header)

    parameter_list = []
    not_valid = []

    for row in reader:
        if not row[index["target"]]:
            continue
        params = {
            "comments": row[index["comments"]],
            "source": row[index["source"]],
            "target": _tmp_target_edit(row[index["target"]]),
            "title": row[index["title"]],
            "description": row[index["description"]],
            "start_datetime": row[index["startdate"]],
            "end_datetime": row[index["enddate"]],
            "scale": row[index["outputscale"]],
            "source_epsg": row[index["horizontalEPSG"]],
            "target_epsg": "2193",
            "compression": "dem_lerc",
            "retile": "true",
            "validate": "false",
            "group": "5",
        }

        params = {**params, **_add_licensor(row, index)}
        params = {**params, **_add_producer(row, index)}

        file_name = row[index["target"]].split("/")[-4:-2]
        file_name = f"{file_name[0]}-{file_name[1]}"
        formatted_file_name = file_name.replace("_", "-").replace(".", "-")

        valid = _valid_params(params)
        
        if not valid[0]:
            not_valid.append(f"# {formatted_file_name}.yaml not written to bash as further action required: {valid[1]}\n")
        else:
            parameter_list.append(COMMAND.format(formatted_file_name, formatted_file_name))

        del params["comments"]
        _write_params(params, formatted_file_name)

    with open("./standardise-publish.sh", "w") as script:
        script.write("#!/bin/bash\n\n")
        script.writelines(parameter_list)
        script.writelines("\n\n\n")
        script.writelines(not_valid)
