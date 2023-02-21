#!/bin/bash

# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./christchurch_2018-2019_0.075m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./gisborne_2012-2013_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./bay-of-plenty_2011-2012_0.25m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./auckland_2010-2012_0.5m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./waikato_2012-2013_0.5m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./tasman_2001-2002_1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./canterbury_2012-2013_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./selwyn_2012-2013_0.125m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./timaru_2012-2013_0.075m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./southland_2005-2011_0.75m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./waimakariri_2013-2014_0.075m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./dunedin_2013_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./otago_2013-2014_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./tasman_2009-2010_0.5m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./tasman_2004-2005_1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./tasman_2003_1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./hurunui_2013_0.125m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./canterbury_2013-2014_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./southland-central-otago_2013-2014_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./southland-central-otago_2015-2017_0.4m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./canterbury_2014-2015_0.3m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./waikato-district_2014_0.1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./northland_2014-2015_0.1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./wairoa_2014-2015_0.1m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./hawkes-bay_2014-2015_0.3m.yaml
# argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./christchurch_2015-2016_0.075m.yaml
argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./waimakariri_2015-2016_0.075m.yaml --generate-name ispi-waimakariri-2015-2016-0-075m-
argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./canterbury_2015-2016_0.3m.yaml --generate-name ispi-canterbury-2015-2016-0-3m-
argo submit ~/dev/topo-workflows/workflows/imagery/standardising-publish-import.yaml -n argo -f ./marlborough_2015-2016_0.2m.yaml --generate-name ispi-marlborough-2015-2016-0-2m-
