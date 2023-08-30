import csv
import json
import os

CATALOG_FILE = "./data/imagery-stac/catalog.json"

with open(CATALOG_FILE, encoding="utf-8") as catalog:
    catalog_json = json.loads(catalog.read())

with open('collection_ids.csv', 'w', newline='') as csvfile:
    csv_writer = csv.writer(csvfile, delimiter=',',
                            quotechar='|', quoting=csv.QUOTE_MINIMAL)
    for link in catalog_json["links"]:
        if link["rel"] == "child":
            collection_link = os.path.abspath("data/imagery-stac/" + link["href"])
            with open(collection_link, encoding="utf-8") as collection:
                collection_json = json.loads(collection.read())
                file_name = link["href"].split("/")[-4:-2]
                file_name = f"{file_name[0]}-{file_name[1]}"
                csv_writer.writerow([file_name, collection_json["id"]])
