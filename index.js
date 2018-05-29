var NY_district_shapes_URL = 'https://data.cityofnewyork.us/resource/jp9i-3b7y.json';
var NY_district_names_URL = 'https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD';
var NY_crimes_URL = 'https://data.cityofnewyork.us/api/views/wuv9-uv8d/rows.json?accessType=DOWNLOAD';
var NY_building_URL = 'https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD';
var NY_air_quality_URL = 'https://data.cityofnewyork.us/resource/ah89-62h9.json'
var URL;
/*
Borough no:
1 Manhattan 12
2 Bronx 12
3 Brooklyn 18
4 Queens 14
5 Staten Island 3
*/

var boroughsID = {'Manhattan': 0, 'Bronx': 1, 'Brooklyn': 2, 'Queens': 3, 'Staten Island': 4};
var boroughs = [{name: 'Manhattan', habitable: 12, districts: [], crimes: []},
{name: 'Bronx', habitable: 12, districts: [], crimes: []},
{name: 'Brooklyn', habitable: 18, districts: [], crimes: []},
{name: 'Queens', habitable: 14, districts: [], crimes: []},
{name: 'Staten Island', habitable: 3, districts: [], crimes: []}];

var districts = new Array(71);
var infoRows = [];
var buildings = [];
var crimes = [];
var map;
var heatmap;
var markers = [];
var nyu = {lat: 40.7291, lng: -73.9965};
var drawMarkers = false;
var drawOnlyHabitable = false;
var drawCrimes = false;
var sortAscending = true;

var isChrome = !!window.chrome && !!window.chrome.webstore;


//https://stackoverflow.com/questions/10024469/whats-the-best-way-to-retry-an-ajax-request-on-failure-using-jquery

function retryAjax(url_, name){
    return $.ajax({
        url : url_,
        type : 'GET',
        tryCount: 0,
        retryLimit: 3,
        success : function(json){
            console.log('Success ' + name);
        },
        error : function(xhr, textStatus, errorThrown){
            if(this.tryCount <= this.retryLimit){
                this.tryCount++;
                console.log('retry' + name);
                $.ajax(this);
            }
        }
    });
}

function getData(){
    $.when(retryAjax(NY_district_shapes_URL, 'features'),
    retryAjax(NY_district_names_URL, 'names'),
    retryAjax(NY_building_URL, 'buildings'),
    retryAjax(NY_crimes_URL, 'crimes'))
    .done(function(data1, data2, data3, data4){
        data1 = data1[0];
        data2 = data2[2].responseJSON.data;
        data3 = data3[2].responseJSON.data;
        data4 = data4[2].responseJSON.data;
        constructFeatures(data1);
        constructNames(data2);
        constructBuildings(data3);
        constructCrimes(data4);
        topDistrictsTable();
    }).fail(function(){
        $.when(this);
        alert('Couldn\'t connet to databases, try reloading the page');
    });

    $.get('nyapple.svg', function(svg){
        $('#svgTest').append($(svg).attr('id', 'navbarIcon'));
    }, 'text').fail(function(){
        console.log('wtf');
    });
}

function constructFeatures(data){
    d3test(data);
    for (var i = 0; i < data.length; i++) {
        var boroCD = data[i].boro_cd;
        var boroughId = (boroCD/100>>0) - 1;
        var districtId = boroCD%100;
        boroughs[boroughId].districts.push(i);

        var multipoly = [];
        var geometry = data[i].the_geom;
        var row = geometry.coordinates;
        for (var j = 0; j < row.length; j++) {
            var poly = row[j][0].map(x => {
                return {lat: x[1], lng: x[0]};
            });
            multipoly.push(poly);
        }
        var centroid = d3.geoCentroid(data[i].the_geom);
        centroid = {lat: centroid[1], lng: centroid[0]};
        var center = getMarker(centroid,'borocd '+ boroCD + ':' + i);
        var color;
        var habitable;
        if(districtId > boroughs[boroughId].habitable){
            habitable = false;
            color = '#00FF00';
        }else{
            habitable = true;
            color = '#FF0000';
        }
        var polygon = new google.maps.Polygon({
            paths: multipoly,
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.35
        });
        districts[i] = {id: i,
            path: multipoly,
            center: center,
            centroid: centroid,
            distance: distanceBetween(nyu, centroid),
            borough: boroughId,
            borocd: boroCD,
            type: "MultiPolygon",
            polygon: polygon,
            habitable: habitable,
            score: 0,
            crimes: 0,
            neighborhoods: [],
            buildings: []
        };
    }
}

function constructNames(data){
    for (var i = 0; i < data.length; i++) {
        point = data[i][9];
        point = point.substring(7, point.length - 1).split(' ');
        //Fulton Ferry and Mill Island centroids are outside of actual district bounds
        var district;
        point = toLatLng(parseFloat(point[1]), parseFloat(point[0]));
        if(data[i][10] == 'Fulton Ferry'){
            district = 70;
        }else if(data[i][10] == 'Mill Island'){
            district = 55;
        }else if(data[i][10] == 'Marble Hill'){
            //Marbel Hill is legaly in Manhattan but geografically in Bronx
            district = 42;
        }else{
            district = findDistrict(point, boroughsID[data[i][16]]);
        }
        districts[district].neighborhoods.push(i);
        infoRows.push({id: i,
            lat: point.lat,
            lng: point.lng,
            name: data[i][10],
            borough: data[i][16],
            district: district
        });
    }
}

function constructBuildings(data){
    var boroughaltID = {'MN': 0,'BX': 1,'BK': 2,'QN': 3,'SI':4};
    for (var i = 0; i < data.length; i++) {
        row = {borough: data[i][15], lat: data[i][23], lng: data[i][24], district: data[i][19], extremely: data[i][31], very: data[i][32], low: data[i][33], moderate: data[i][34]};
        var borodistricts = boroughs[boroughsID[row.borough]].districts;
        for (var j = 0; j < borodistricts.length; j++) {
            if(parseInt(row.district.substring(3,5)) == districts[borodistricts[j]].borocd%100 ){
                district = borodistricts[j];
                row.district = district;
                districts[district].score = Math.max(districts[district].score, row.low);
                districts[district].buildings.push(i);
                break;
            }
        }
        buildings.push(row);
    }
}

function constructCrimes(data){
    var boroughaltID = {'MANHATTAN': 0,'BRONX': 1,'BROOKLYN': 2,'QUEENS': 3,'STATEN ISLAND':4};
    for (var i = 0; i < data.length; i++) {
        point = {lat: parseFloat(data[i][29]), lng: parseFloat(data[i][30])};
        district = findDistrict(point);
        if(district == -1){
            //addMarker(point,'CRIMENLOL');
            continue;
        }
        console.log("crime");
        console.log(data[i]);
        crimes.push(point);
        districts[district].crimes++;
        boroughs[boroughaltID[data[i][21]]].crimes.push(point);
    }
    for (var i = 0; i < 5; i++) {
        boroughs[i].crimes = boroughs[i].crimes.map(x => new google.maps.LatLng(x));
        boroughs[i].heatmap = new google.maps.visualization.HeatmapLayer({data: boroughs[i].crimes});
    }
}

function showCrimes(){
    if(drawCrimes){
        heatmap.setMap(map);
    }else{
        heatmap.setMap(null);
    }
}

function neighborhoodsTable(){
    var columns = ['id','lat','lng','name','borough','district'];
    getTable(infoRows, columns);
    $('#getData').addClass('selected');
}

function buildingsTable(){
    var columns  = ['borough', 'district', 'lat', 'lng'];
    getTable(buildings, columns);
    $('#getBuildingsData').addClass('selected');
}

function districtsTable(){
    var columns = ['id', 'borough', 'borocd', 'score','distance','crimes'];
    getTable(districts, columns, function(row){
        addDistrict(row.id);
    });
    $('#getDistrictsData').addClass('selected');
    $('#districtsTableMessage').show();
}

var topCalculated = false;

function topDistrictsTable(){
    console.log("hey1");
    var columns = ['id', 'borough', 'borocd','score','distance','crimes','zscore'];
    if(!topCalculated){
        var affordability = arr.zScores(districts.map(a => a.score));
        var distances = arr.zScores(districts.map(a => a.distance));
        var crimes = arr.zScores(districts.map(a => a.crimes));
        var zscore = affordability.map(function(a,i){
            return a - distances[i] - crimes[i];
        });
        districts = districts.map(function(a,i){
            a.zscore = zscore[i];
            return a;
        });
    }
    getTable(districts.filter(x => x.habitable), columns, function(row){
        addDistrict(row.id);
    });
    console.log("hey");
    $('#top').addClass('selected');
    topCalculated = true;
}

function sortByColumn(tbody, column){
    var headers = $('table thead tr').children();
    headers.removeClass('aes');
    headers.removeClass('des');
    var header = $('table thead tr').find('th:contains('+column+')');
    if(sortAscending){
        header.addClass('aes');
        tbody.selectAll('tr').sort(function(a,b){ return d3.ascending(a[column], b[column]); });
    }else{
        header.addClass('des');
        tbody.selectAll('tr').sort(function(a,b){ return d3.descending(a[column], b[column]); });
    }
    sortAscending = !sortAscending;
    paginate();
}

var dataTable;

function paginate(){
    var tbody = $('table tbody').children();
    var count = $('table tbody tr').length;
    var pages = $('#paginateSelect').val();
    tbody.each(function(i){
        if(i >= pages){
            $(this).hide();
        }else{
            $(this).show();
        }
    });
}

function getTable(data, columns, rowClick){
    if(rowClick == undefined){
        rowClick = function(){};
    }
    $('#tableSelector div button').removeClass('selected');
    $('#districtsTableMessage').hide();
    //http://bl.ocks.org/jfreels/6734025
    //http://bl.ocks.org/AMDS/4a61497182b8fcb05906
    //https://stackoverflow.com/questions/32871044/how-to-update-d3-table
    var table = d3.select('table');
    var thead = table.select('thead').select('tr');
    var tbody = table.select('tbody');
    thead = thead.selectAll('th')
    .data(columns)
    .text( function(column) { return column;})
    .on('click',function(column){sortByColumn(tbody,column)});

    thead.enter()
    .append('th')
    .text(function (column) { return column;})
    .on('click',function(column){sortByColumn(tbody,column)});

    thead.exit().remove();

    var rows = tbody.selectAll('tr')
    .data(data)
    .on('click', rowClick);

    rows.enter()
    .append('tr')
    .on('click', rowClick)
    .selectAll('td')
    .data( function(row){
        return columns.map( function(column){
            return {column: column, value: row[column]};
        });
    })
    .enter()
    .append('td')
    .text(function(d){ return d.value; });

    rows.exit().remove();

    var cells = rows.selectAll('td')
    .data(function (row) {
        return columns.map(function (column) {
            return {column: column, value: row[column]};
        });
    }).text( function(d) { return d.value});

    cells.enter()
    .append('td')
    .text(function (d) { return d.value; });

    cells.exit().remove();
    paginate();
    //dataTable = $('table').DataTable();
}

window.initMap = function() {
    var style = $.ajax({
        url :'mapstyle.json',
        beforeSend: function(xhr){
            if (xhr.overrideMimeType)
            {
                xhr.overrideMimeType("application/json");
            }
        },
        success: function(style){
            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 10,
                center: {lat: 40.7291, lng: -73.9965},
                styles: style.style
            });
            addMarker(nyu, 'NYU');
        },
        dataType: 'json'
    });
    //map.data.loadGeoJson(NY_district_shapes_URL);
}

function checkDrawLimits(){
    drawOnlyHabitable = $('#drawCB1')[0].checked;
    drawMarkers = $('#drawCB2')[0].checked;
    drawCrimes = $('#drawCB3')[0].checked;
}

function addDistrictInput(){
    checkDrawLimits();
    var a = parseInt($('#districtNo').val());
    addDistrict(a-1);
}

function addBoroughInput(){
    checkDrawLimits();
    var a = parseInt($('#boroughNo').val());
    addBorough(a-1);
}

function addBoroughsCheckBoxes(){
    checkDrawLimits();
    var checkBoxes = $('#boroughCheckboxes input:checkbox').each(function(i){
        if(this.checked){
            addBorough(i);
        }else{
            removeBorough(i);
        }
    });
}

function addNeighbour(a){
    var data = infoRows[a];
    addMarker({lat: data.lat, lng: data.lng}, data.name);
    addDistrict(data.district);
    map.setCenter({lat: data.lat, lng: data.lng});
}

function toCSV(){
    //https://forums.asp.net/t/1985239.aspx?How+to+remove+style+display+none+columns+when+exporting+an+HTML+table+to+Excel+
    var table = $('#neighborhoodTable').clone();
    table.find('[style*="display: none"]').remove();
    table.tableToCSV();
}

function test(){
    for (var i = 0; i < districts.length; i++) {
        if(districts[i].neighborhoods.length == 0){
            addDistrict(i);
        }
    }
}

/*HOlY MOLLY D3
http://d3indepth.com/geographic/
https://bl.ocks.org/d3indepth/3ccd770923a61f26f55156657e2f51e8
*/

function handleMouseover(d,i){
    var district = districts[i];
    var centroid = district.centroid;
    //console.log(centroid);
    var str = ['Borough: ' + boroughs[district.borough].name, 'Distance to NYU: '+ miles(district.distance) + ' miles', 'Centroid: ' + centroid.lat + ' ' + centroid.lng];
    var lines = d3.select('#geoinfo')
    .selectAll('p')
    .data(str)
    .text(function(d){ return d; });

    lines
    .enter()
    .append('p')
    .text(function(d){ return d;});
}

var features;
var projection;
var path;
var mapRatio = 0.5;

d3.select(window).on('resize', resize);

function miles(km){
    return km*0.621371;
}

//http://eyeseast.github.io/visible-data/2013/08/26/responsive-d3/
function resize(){
    var width = parseInt(d3.select("#geoinfo").style("width"));
    var padding = 10;
    width = width - 2*padding;
    height = width * mapRatio;
    projection.fitExtent([[padding,padding],[width,height]], features);

    var svg = d3.select('#d3 svg')
    .attr('width', width + padding*2)
    .attr('height', height + padding*2);

    svg.selectAll('path')
    .attr('d', path);
}

function d3test(features){
    features = features.map(x => {
        var obj = {};
        obj.type = "Feature";
        obj.geometry = x.the_geom;
        return obj;
    });
    featureCollection = { type: 'FeatureCollection', features: features};
    features = featureCollection;
    console.log(featureCollection.features[0]);
    var width = parseInt(d3.select("#geoinfo").style("width"));
    var padding = 10;
    height = width * mapRatio;
    var context = false, graticule = false;

    //
    //
    projection = d3.geoOrthographic()
    .rotate([90,0])
    .fitExtent([[padding,0],[width,height]], featureCollection);

    path = d3.geoPath()
    .projection(projection);

    //http://bl.ocks.org/nbremer/a43dbd5690ccd5ac4c6cc392415140e7
    /*var colorScale = d3.scale.linear()
    .domain([-15, 7.5, 30])
    .range(["#2c7bb6", "#ffff8c", "#d7191c"])
    .interpolate(d3.interpolateHcl);*/
    $(".loader").hide();

    if(context){
        var context = d3.select('canvas')
        .attr('width', width)
        .attr('height', height)
        .node()
        .getContext('2d');

        path.context(context);

        context.beginPath();
        context.lineWidth = 0.5;
        context.strokeStyle = '#333';
        path(featureCollection);
        context.stroke();

        context.beginPath();
        context.setLineDash([2, 2]);
        context.rect(padding, 0, width - 2*padding, height);
        context.stroke();

        if(graticule){
            var graticule = d3.geoGraticule().step([0.2,0.2]);
            context.beginPath();
            context.strokeStyle = '#ccc';
            path(graticule());
            context.stroke();
        }
    }else{
        $("#canvas").hide();
        var svg = d3.select('#d3 svg')
        .attr('width', width)
        .attr('height', height)
        .style('border', '2px solid steelblue');

        if(graticule){
            var graticule = d3.geoGraticule().step([5,5]);

            svg.append('path')
            .datum(graticule)
            .attr('class', 'graticule')
            .attr('d', path);
        }

        var u = svg
        .selectAll('path')
        .data(featureCollection.features);

        u.enter()
        .append('path')
        .attr('d', path)
        .on('mouseover', handleMouseover);

        u.exit().remove();
    }


    /**/
}


$('document').ready(function(){
    alert("If you are using chrome some things may be broken, better use Firefox!");
    getData();
    //getBuildings();
    $('#getNYDistrictShape').click(addDistrictInput);
    $('#getNYBoroughShape').click(addBoroughInput);
    $('#addBoroughsCheckBoxes').click(addBoroughsCheckBoxes);
    $('#clearBorders').click(clearBorders);
    $('#getData').click(neighborhoodsTable);
    $('#getBuildingsData').click(buildingsTable);
    $('#getDistrictsData').click(districtsTable);
    $('#top').click(topDistrictsTable);
    $('#export').click(toCSV);
    $('#paginateSelect').change(paginate);

    URL = window.location.href;
})
