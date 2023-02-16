import csv
from typing import List, Optional

import yaml
from linz_logger import get_log

# nb: CHANGE if working from a different source
SOURCE = "s3://linz-data-lake-raster-prod/"
PARAMETERS_CSV = "./imagery-standardising-parameters-bulk-process.csv"
PRODUCERS = [
    "AAM NZ",
    "Aerial Surveys",
    "Beca",
    "GeoSmart",
    "Landpro",
    "Maxar",
    "NZ Aerial Mapping",
    "Recon",
    "Terralink International",
    "UAV Mapping NZ",
]
LICENSORS = [
    "Ashburton District Council",
    "Auckland Council",
    "BOPLASS",
    "Bay of Plenty Regional Council",
    "Buller District Council",
    "Canterbury Aerial Imagery Consortium (CAI)",
    "Carterton District Council",
    "Central Hawke's Bay District Council",
    "Central Otago District Council",
    "Chatham Islands Council",
    "Christchurch City Council",
    "Clutha District Council",
    "CoLAB",
    "Department of Conservation",
    "Dunedin City Council",
    "Environment Canterbury",
    "Environment Southland",
    "Far North District Council",
    "Gisborne District Council",
    "Gore District Council",
    "Greater Wellington Regional Council",
    "Grey District Council",
    "Hamilton City Council",
    "Hastings District Council",
    "Hauraki District Council",
    "Hawke's Bay Local Authority Shared Services (HB LASS)",
    "Hawke's Bay Regional Council",
    "Horizons Regional Council",
    "Horowhenua District Council",
    "Hurunui District Council",
    "Hutt City Council",
    "Invercargill City Council",
    "Kaikōura District Council",
    "Kaipara District Council",
    "Kawerau District Council",
    "Kāpiti Coast District Council",
    "Mackenzie District Council",
    "Manawatū District Council",
    "Manawatū-Whanganui LASS",
    "Marlborough District Council",
    "Masterton District Council",
    "Matamata-Piako District Council",
    "Maxar Technologies",
    "Ministry of Primary Industries",
    "NZ Aerial Mapping",
    "Napier City Council",
    "Nelson City Council",
    "New Plymouth District Council",
    "Northland Regional Council",
    "Ōpōtiki District Council",
    "Ōtorohanga District Council",
    "Otago Regional Council",
    "Palmerston North City Council",
    "Porirua City Council",
    "Queenstown-Lakes District Council",
    "Rangitīkei District Council",
    "Rotorua District Council",
    "Ruapehu District Council",
    "Selwyn District Council",
    "Sinergise",
    "South Taranaki District Council",
    "South Waikato District Council",
    "South Wairarapa District Council",
    "Southland District Council",
    "Stratford District Council",
    "Taranaki Regional Council",
    "Tararua District Council",
    "Tasman District Council",
    "Taupō District Council",
    "Tauranga City Council",
    "Terralink International",
    "Thames-Coromandel District Council",
    "Timaru District Council",
    "Toitū Te Whenua Land Information New Zealand",
    "Upper Hutt City Council",
    "Waikato District Council",
    "Waikato Regional Aerial Photography Service (WRAPS)",
    "Waikato Regional Council",
    "Waimakariri District Council",
    "Waimate District Council",
    "Waipā District Council",
    "Wairoa District Council",
    "Waitaki District Council",
    "Waitomo District Council",
    "Waka Kotahi",
    "Wellington City Council",
    "West Coast Regional Council",
    "Western Bay of Plenty District Council",
    "Westland District Council",
    "Whakatāne District Council",
    "Whanganui District Council",
    "Whangārei District Council",
]
SCALES = ["500", "1000", "2000", "5000", "10000"]

command_list = []


def _format_date(date: str) -> str:
    fd_lst = date.split("/")
    year = fd_lst[2]
    month = f"{int(fd_lst[0]):02}"
    day = f"{int(fd_lst[1]):02}"
    return f"{year}-{month}-{day}"


def _validate_licensor(licensor: str) -> Optional[str]:
    if licensor in LICENSORS:
        return licensor
    elif licensor == "BOPLASS Limited":
        return "BOPLASS"
    elif licensor == "Kapiti Coast District Council":
        return "Kāpiti Coast District Council"
    elif licensor == "The Canterbury Aerial Imagery (CAI) Consortium":
        return "Canterbury Aerial Imagery Consortium (CAI)"
    elif licensor == "Hawke's Bay Local Authority Shared Services (HBLASS)":
        return "Hawke's Bay Local Authority Shared Services (HB LASS)"
    elif "and" in licensor:
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
    return None


def _validate_scale(scale: str) -> Optional[str]:
    if scale in SCALES:
        return scale
    return None


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

    command = 'argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f "./{0}.yaml"\n'

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

        if row[ind_basemaps] == "":
            get_log().info(
                "basemaps import required",
                source=row[ind_source],
                title=row[ind_title],
            )
        params = {
            "source": row[ind_source].rstrip("/"),
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

        file_name = row[ind_title].lower().replace(" ", "-").replace(".", "_")
        command_list.append(command.format(file_name))

        with open(f"./{file_name}.yaml", "w", encoding="utf-8") as output:
            yaml.dump(
                params,
                output,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
                width=1000,
            )

with open("standardise-publish.sh", "w") as script:
    script.write("#!/bin/bash\n\n")
    script.writelines(command_list)
