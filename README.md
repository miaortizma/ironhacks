## webapp_phase1

### NYU easy Residence

keywords: Community Districts, Neighbourhoods, map

#### Description of the datasets and function design

| name | link | datatype | data columns used | data amount |
| ---- |:----:| --------:| ----------------- |:-----------:|
|Neighborhood Names GIS |	[link](https://catalog.data.gov/dataset/neighborhood-names-gis) | NY_neighborhood_names	| id, name, borough, lat,lng |	300 rows |
|NY Districts geoshapes |	[link](http://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson) |	GeoJson, NY_districts_shapes | BoroCD, geometry	| 71 rows

My project can be used to see information from NY neighbourhoods and also community districts geo data, specifically users can graph the borders of the desired districts and boroughs.

#### Map View:

1. [Y] Basic Map with specific location ( Map is centered in NYU ).
2. [N] [describe] There is currently no cover on the map apart from the district borders that the user can draw.

#### Data Visualization:

1. [N] Currently there are no graphs in the web_app.
2. [N] Any interaction available on the graph?.

#### Interaction Form:

1. [Y] The user can press a button to get the list of neighbourhoods in NY.
2. [N] The user cannot operate on the form apart from getting the data.
3. [Y] The user can input district or borough id into a text field.
4. [Y] Based on the district or borough id the user can press a button that draws borders based on the filters that they provide.
5. [N] No current interaction with data visualization

Tested on Chrome and Firefox
