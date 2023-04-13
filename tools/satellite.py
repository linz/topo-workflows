import csv
from typing import Dict, List, Optional

import yaml
from linz_logger import get_log

# #######################################
# USER PARAMETERS:
SOURCE = "s3://linz-data-lake-raster-prod/"
PARAMETERS_CSV = "./satellite-imagery-parameters.csv"
# #######################################

# read in enums from workflow template
with open("../workflows/imagery/standardising.yaml", "r") as f:
    workflow = yaml.load(f, Loader=yaml.loader.SafeLoader)
    for parameter in workflow["spec"]["arguments"]["parameters"]:
        if parameter["name"] == "producer":
            PRODUCERS = parameter["enum"]
        if parameter["name"] == "licensor":
            LICENSORS = parameter["enum"]
        if parameter["name"] == "scale":
            SCALES = parameter["enum"]


def _format_date(date: str) -> str:
    date = date.rstrip("T00:00:00.000Z")
    fd_lst = date.split("-")
    year = fd_lst[0]
    day = f"{int(fd_lst[2]):02}"
    month = f"{int(fd_lst[1]):02}"
    return f"{year}-{month}-{day}"


def _validate_licensor(licensor: str) -> Optional[str]:
    if licensor in LICENSORS:
        return licensor
    if licensor == "Maxar, Inc":
        return "Maxar, Inc"
    if licensor == "European Space Agency":
        return "European Space Agency"
    if licensor == "Sinergise Ltd":
        return "Sinergise Ltd"
    return None


def _add_licensor(row: List[str], index: Dict[str, int]) -> Dict[str, str]:
    licensor = _validate_licensor(row[index["licensor"]])
    if not licensor:
        get_log().warning(
            "skipped: invalid licensor",
            licensor=row[index["licensor"]],
            source=row[index["source"]],
            title=row[index["title"]],
        )
        return {}
    elif licensor and ";" in licensor:
        return {"licensor-list": licensor, "licensor": ""}
    else:
        return {"licensor": licensor, "licensor-list": ""}


def _get_valid_producer(producer: str) -> Dict[str, str]:
    if producer in PRODUCERS:
        return {"producer": producer}
    elif producer == "European Space Agency":
        return {"producer": "European Space Agency"}
    elif producer == "Sinergise Ltd":
        return {"producer": "Sinergise Ltd"}
    elif producer == "Maxar, Inc.":
        return {"producer": "Maxar, Inc."}
    return {}


def _get_valid_scale(scale: str) -> Dict[str, str]:
    if scale in SCALES:
        return {"scale": scale}
    return {}


def _index_csv(header: List[str]) -> Dict[str, int]:
    ind = {}
    ind["comment"] = header.index("Comment")
    ind["source"] = header.index("source")
    ind["target"] = header.index("target")
    ind["scale"] = header.index("scale")
    ind["epsg"] = header.index("EPSG Code")
    ind["title"] = header.index("Title")
    ind["licensor"] = header.index("licensor(s)")
    ind["producer"] = header.index("producer(s)")
    ind["description"] = header.index("description")
    ind["startdate"] = header.index("start_datetime")
    ind["enddate"] = header.index("end_datetime")
    return ind


def _validate_params(params: Dict[str, str], row: List[str], index: Dict[str, int]) -> bool:
    if not params["scale"]:
        get_log().warning(
            "skipped: invalid scale",
            scale=row[index["scale"]],
            source=row[index["source"]],
            title=row[index["title"]],
        )
        return False
    if not params["producer"]:
        get_log().warning(
            "skipped: invalid producer",
            producer=row[index["producer"]],
            source=row[index["source"]],
            title=row[index["title"]],
        )
        return False
    return True


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


def main() -> None:
    sp_list = []

    command = 'argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f "./{0}.yaml" --generate-name ispi-{1}-\n'

    with open(PARAMETERS_CSV, "r") as csv_file:
        reader = csv.reader(csv_file)
        header = next(reader)
        index = _index_csv(header)

        for row in reader:
            if not row[index["source"]].startswith(SOURCE):
                continue

            if row[index["comment"]] != "":
                get_log().warning(
                    "skipped: comment",
                    comment=row[index["comment"]],
                    source=row[index["source"]],
                    title=row[index["title"]],
                )
                continue

            formats = {" ": "-", "/": "-", ".": "_", "(": "", ")": ""}
            formatted_file_name = row[index["title"]].lower()
            for x, y in formats.items():
                formatted_file_name = formatted_file_name.replace(x, y)
            print(formatted_file_name)

            params = {
                "source": row[index["source"]].rstrip("/") + "/",
                "target": row[index["target"]],
                "title": row[index["title"]],
                "description": row[index["description"]],
                "start-datetime": _format_date(row[index["startdate"]]),
                "end-datetime": _format_date(row[index["enddate"]]),
                "source-epsg": row[index["epsg"]],
                "target-epsg": row[index["epsg"]],
            }

            params = {**params, **_add_licensor(row, index)}
            params = {**params, **_get_valid_producer(row[index["producer"]])}
            params = {**params, **_get_valid_scale(row[index["scale"]])}

            if not _validate_params(params, row, index):
                continue

            sp_list.append(command.format(formatted_file_name, formatted_file_name))

            _write_params(params, formatted_file_name)

    with open("standardise-publish.sh", "w") as script:
        script.write("#!/bin/bash\n\n")
        script.writelines(sp_list)


main()
