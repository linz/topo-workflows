# Contributing

## Known issues

### Passing optional parameters to `linz/argo-tasks` CLI

[linz/argo-tasks](https://github.com/linz/argo-tasks/) uses [`cmd-ts`](https://github.com/Schniz/cmd-ts) which has an issue when an optional parameter is passed without value at the end of the command.

For example:

```yaml
-   name: main
    [...]
    container:
    image: '019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/argo-tasks:{{=inputs.parameters.version}}'
    args:
        - 'stac'
        - 'setup'
        - '--start-year={{=sprig.trunc(4, inputs.parameters.start_datetime)}}'
        - '--end-year={{=sprig.trunc(4, inputs.parameters.end_datetime)}}'
        - '--region={{inputs.parameters.region}}'
        - '--geographic-description={{inputs.parameters.geographic_description}}'
        - '--odr-url={{inputs.parameters.odr_url}}'
        - '--geospatial-category={{inputs.parameters.geospatial_category}}'
        - '--gsd={{inputs.parameters.gsd}}'
        - '--survey-id={{inputs.parameters.survey_id}}' # optional parameter
```

will generate the following error:

```shell
  stac setup --start-year= --end-year= --region=new-zealand --geographic-description= --odr-url=s3://nz-elevation/new-zealand/new-zealand/dem-hillshade_1m/2193/ --geospatial-category=dem-hillshade --gsd=1 --survey-id
                                                                                                                                                                                                             ^ No value provided for --survey-id
```

To workaround this issue, place the optional parameters before any mandatory parameter (that will have a value):

```yaml
args:
  - 'stac'
  - 'setup'
  - '--start-year={{=sprig.trunc(4, inputs.parameters.start_datetime)}}'
  - '--end-year={{=sprig.trunc(4, inputs.parameters.end_datetime)}}'
  - '--region={{inputs.parameters.region}}'
  - '--geographic-description={{inputs.parameters.geographic_description}}'
  - '--survey-id={{inputs.parameters.survey_id}}' # optional parameter
  - '--odr-url={{inputs.parameters.odr_url}}'
  - '--geospatial-category={{inputs.parameters.geospatial_category}}'
  - '--gsd={{inputs.parameters.gsd}}'
```
