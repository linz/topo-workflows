import csv
from typing import List, Optional

import yaml
from linz_logger import get_log

# nb: CHANGE if working from a different source
# SOURCE = "s3://linz-data-lake-raster-prod/"
SOURCE = "s3://linz-raster-data-store/"

PARAMETERS_CSV = "./imagery-standardising-parameters-bulk-process.csv"
with open("../workflows/imagery/standardising.yaml", "r") as f:
    workflow = yaml.load(f, Loader=yaml.loader.SafeLoader)
    for parameter in workflow["spec"]["arguments"]["parameters"]:
        if parameter["name"] == "producer":
            PRODUCERS = parameter["enum"]
        if parameter["name"] == "licensor":
            LICENSORS = parameter["enum"]
        if parameter["name"] == "scale":
            SCALES = parameter["enum"]

spi_list = []
sp_list = []


def _format_date(date: str) -> str:
    fd_lst = date.split("/")
    year = fd_lst[2]
    day = f"{int(fd_lst[0]):02}"
    month = f"{int(fd_lst[1]):02}"
    return f"{year}-{month}-{day}"


def _validate_licensor(licensor: str) -> Optional[str]:
    if licensor in LICENSORS:
        return licensor
    if licensor == "BOPLASS Limited":
        return "BOPLASS"
    if licensor == "Kapiti Coast District Council" or licensor == "Kapiti District Council":
        return "Kāpiti Coast District Council"
    if licensor == "The Canterbury Aerial Imagery (CAI) Consortium":
        return "Canterbury Aerial Imagery Consortium (CAI)"
    if licensor == "Hawke's Bay Local Authority Shared Services (HBLASS)":
        return "Hawke's Bay Local Authority Shared Services (HB LASS)"
    if licensor == "Central Hawkes Bay District Council":
        return "Central Hawke's Bay District Council"
    if licensor == "Thames Coromandel District Council":
        return "Thames-Coromandel District Council"
    if licensor == "Waikato Regional Aerial Photography Service (WRAPS) 2017-2019":
        return "Waikato Regional Aerial Photography Service (WRAPS)"
    if licensor == "Northland Aerial Imagery Consortium (NAIC)":
        return "Northland Aerial Imagery Consortium (NAIC)"
    if licensor == "AAM NZ Limited":
        return "AAM NZ"
    if " and " in licensor:
        return licensor.replace(" and ", ";")
    return None


def _validate_producer(producer: str) -> Optional[str]:
    if producer in PRODUCERS:
        return producer
    elif producer == "NZ Aerial Mapping Ltd":
        return "NZ Aerial Mapping"
    elif producer == "Aerial Surveys Ltd" or producer == "Aerial Surveys Limited":
        return "Aerial Surveys"
    elif producer == "AAM NZ Limited":
        return "AAM NZ"
    elif producer == "Landpro Ltd":
        return "Landpro"
    elif producer == "UAV Mapping NZ Ltd":
        return "UAV Mapping NZ"
    return None


def _validate_scale(scale: str) -> Optional[str]:
    if scale in SCALES:
        return scale
    return None

def main() -> None:
    with open(PARAMETERS_CSV, "r") as csv_file:
        reader = csv.reader(csv_file)
        header = next(reader)

        ind_comment = header.index("Comment")
        ind_source = header.index("source")
        ind_target = header.index("target")
        ind_scale = header.index("scale")
        ind_title = header.index("Title")
        ind_licensor = header.index("licensor(s)")
        ind_producer = header.index("producer(s)")
        ind_description = header.index("description")
        ind_startdate = header.index("start_datetime")
        ind_enddate = header.index("end_datetime")
        ind_basemaps = header.index("basemaps s3 path")

        command = "argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./{0}.yaml --generate-name ispi-{1}-\n"

        for row in reader:
            if not row[ind_source].startswith(SOURCE):
                continue

            if row[ind_comment] != "":
                get_log().warning(
                    "skipped: comment",
                    comment=row[ind_comment],
                    source=row[ind_source],
                    title=row[ind_title],
                )
                continue

            params = {
                "source": row[ind_source].rstrip("/") + "/",
                "target": row[ind_target],
                "scale": _validate_scale(row[ind_scale]),
                "title": row[ind_title],
                "description": row[ind_description],
                "producer": _validate_producer(row[ind_producer]),
                "start-datetime": _format_date(row[ind_startdate]),
                "end-datetime": _format_date(row[ind_enddate]),
            }

            licensor = _validate_licensor(row[ind_licensor])
            if licensor and ";" in licensor:
                params["licensor-list"] = licensor
                params["licensor"] = ""
            else:
                params["licensor"] = licensor
                params["licensor-list"] = ""

            if not params["licensor"] and params["licensor-list"] == "":
                get_log().warning(
                    "skipped: invalid licensor",
                    licensor=row[ind_licensor],
                    source=row[ind_source],
                    title=row[ind_title],
                )
                continue

            if not params["producer"]:
                get_log().warning(
                    "skipped: invalid producer",
                    producer=row[ind_producer],
                    source=row[ind_source],
                    title=row[ind_title],
                )
                continue

            if not params["scale"]:
                get_log().warning(
                    "skipped: invalid scale",
                    scale=f"{row[ind_scale]}",
                    source=row[ind_source],
                    title=row[ind_title],
                )
                continue

            file_name = row[ind_target].rstrip("/rgb/2193/").split("/")[-1]
            formatted_file_name = file_name.replace("_", "-").replace(".", "-")

            if row[ind_basemaps] == "":
                get_log().info(
                    "basemaps import required",
                    source=row[ind_source],
                    title=row[ind_title],
                )
                bm_params = {
                    "category": "Urban Aerial Photos",
                    "name": params["target"].rstrip("/rgb/2193/").split("/")[-1],
                    "tile-matrix": "NZTM2000Quad/WebMercatorQuad",
                    "blend": "20",
                    "aligned-level": "6",
                    "create-pull-request": "true"
                }
                params = {**params, **bm_params}
                spi_list.append(command.format(formatted_file_name, formatted_file_name))
            else:
                sp_list.append(command.format(formatted_file_name, formatted_file_name))

            with open(f"./{formatted_file_name}.yaml", "w", encoding="utf-8") as output:
                yaml.dump(
                    params,
                    output,
                    default_flow_style=False,
                    default_style='"',
                    sort_keys=False,
                    allow_unicode=True,
                    width=1000,
                )

    with open("standardise-publish.sh", "w") as script:
        script.write("#!/bin/bash\n\n")
        script.writelines(sp_list)

    with open("standardise-publish-import.sh", "w") as script:
        script.write("#!/bin/bash\n\n")
        script.writelines(spi_list)

main()
