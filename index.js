var NY_district_shapes_URL = "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson";
var NY_district_names_URL = "https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD";
var NY_crimes_URL = "https://data.cityofnewyork.us/api/views/wuv9-uv8d/rows.json?accessType=DOWNLOAD";
var NY_building_URL = "https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD";
var URL;
/*
Borough no:
1 Manhattan 12
2 Bronx 12
3 Brooklyn 18
4 Queens 14
5 Staten Island 3

*/

var boroughsID = {"Manhattan": 0, "Bronx": 1, "Brooklyn": 2, "Queens": 3, "Staten Island": 4};
var boroughs = [{name: "Manhattan", habitable: 12},
                {name: "Bronx", habitable: 12, districts: []},
                {name: "Brooklyn", habitable: 18, districts: []},
                {name: "Queens", habitable: 14, districts: []},
                {name: "Staten Island", habitable: 3, districts: []}];

var districts = new Array(71);
var infoRows = [];
var buildings = [];
var crimes = [];
var map;
var markers = [];
var nyu = {lat: 40.7291, lng: -73.9965};
var drawMarkers = false;
var drawOnlyHabitable = false;
var sortAscending = true;


//https://stackoverflow.com/questions/10024469/whats-the-best-way-to-retry-an-ajax-request-on-failure-using-jquery

function method1(){
    return $.ajax({
        url : NY_district_shapes_URL,
        type : 'GET',
        tryCount: 0,
        retryLimit: 3,
        success : function(json){
            console.log('Sucess shapes');
        },
        error : function(xhr, textStatus, errorThrown){
            if(this.tryCount <= this.retryLimit){
                this.tryCount++;
                console.log("retry shapes");
                $.ajax(this);
            }
        }
    });

}

function method2(){
    return $.ajax({
        url : NY_district_names_URL,
        type : 'GET',
        tryCount: 0,
        retryLimit: 3,
        success : function(json){
            console.log('Success names');
        },
        error : function(xhr, textStatus, errorThrown){
            if(this.tryCount <= this.retryLimit){
                this.tryCount++;
                console.log("retry names");
                $.ajax(this);
                return;
            }
        }
    });
}

function method3(){
    return $.ajax({
        url : NY_building_URL,
        type : 'GET',
        tryCount: 0,
        retryLimit: 3,
        success : function(json){
            console.log('Success buildings');
        },
        error : function(xhr, textStatus, errorThrown){
            if(this.tryCount <= this.retryLimit){
                this.tryCount++;
                console.log("retry buildings");
                $.ajax(this);
                return;
            }
        }
    });
}

function method4(){
    return $.ajax({
        url : NY_crimes_URL,
        type : 'GET',
        tryCount: 0,
        retryLimit: 3,
        success : function(json){
            console.log('Success crimes');
        },
        error : function(xhr, textStatus, errorThrown){
            if(this.tryCount <= this.retryLimit){
                this.tryCount++;
                console.log("retry success");
                $.ajax(this);
                return;
            }
        }
    });
}

function getData(){
     $.when(method1(), method2(), method3(), method4() )
    .done(function(data1, data2, data3, data4){
         data1 = $.parseJSON(data1[2].responseText).features;
         data2 = data2[2].responseJSON.data;
         data3 = data3[2].responseJSON.data;
         data4 = data4[2].responseJSON.data;
         constructFeatures(data1);
         constructNames(data2);
         constructBuildings(data3);
         constructCrimes(data4);
         neighborhoodsTable();
     }).fail(function(){
         $.when(this);
         alert("Couldn't connet to databases, try reloading the page");
     });

     $.get('nyapple.svg', function(svg){
         $("#svgTest").append(svg);
     }, 'text');
}

function constructFeatures(districtsFeatures){
    for (var i = 0; i < districtsFeatures.length; i++) {
        var boroCD = districtsFeatures[i].properties.BoroCD;
        var boroughId = (boroCD/100>>0) - 1;
        var districtId = boroCD%100;
        var data = districtsFeatures[i].geometry.coordinates;
        var coords = [];
        if(boroughs[boroughId].districts == undefined){
            boroughs[boroughId].districts = [];
        }
        boroughs[boroughId].districts.push(i);
        var dataRow;
        var bounds = new google.maps.LatLngBounds();
        if(data.length > 1){
            for (var j = 0; j < data.length; j++) {
                var path = [];
                dataRow = data[j][0];
                for (var k = 0; k < dataRow.length; k++) {
                    path.push({lat: dataRow[k][1], lng: dataRow[k][0]});
                    bounds.extend(path[k]);
                }
                coords.push(path);
            }
        }else{
            data = data[0];
            for (var p = 0; p < data.length; p++) {
                coords.push({lat: data[p][1], lng: data[p][0]});
                bounds.extend(coords[p]);
            }
        }
        var center = getMarker(bounds.getCenter(),"borocd "+ boroCD + ":" + i);
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
            paths: coords,
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.35
        });
        var LatLng = center.getPosition();
        LatLng = {lat: LatLng.lat(), lng: LatLng.lng()};
        districts[i] = {id: i,
            path: coords,
            center: center,
            distance:distanceBetween(nyu, LatLng),
            borough: boroughId,
            borocd: boroCD,
            type: districtsFeatures[i].geometry.type,
            polygon: polygon,
            habitable: habitable,
            score: 0,
            crimes: 0,
            neighborhoods: [],
            buildings: []};
        }
}

function constructNames(data){
    for (var i = 0; i < data.length; i++) {
        point = data[i][9];
        point = point.substring(7, point.length - 1).split(" ");
        //Fulton Ferry and Mill Island centroids are outside of actual district bounds
        var district;
        point = toLatLng(parseFloat(point[1]), parseFloat(point[0]));
        if(data[i][10] == "Fulton Ferry"){
            district = 70;
        }else if(data[i][10] == "Mill Island"){
            district = 55;
        }else if(data[i][10] == "Marble Hill"){
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
            district: district});
        }
}

function constructBuildings(data){
    var boroughaltID = {"MN": 0,"BX": 1,"BK": 2,"QN": 3,"SI":4};
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
    for (var i = 0; i < data.length; i++) {
        point = {lat: parseFloat(data[i][29]), lng: parseFloat(data[i][30])};
        district = findDistrict(point);
        if(district == -1){
            addMarker(point,"CRIMENLOL");
            continue;
        }
        crimes.push(point);
        districts[district].crimes++;
    }
    //console.log(crimes);
    crimes = crimes.map(x => new google.maps.LatLng(x));

    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: crimes
    });
    heatmap.setMap(map);
}

function neighborhoodsTable(){
    var columns = ['id','lat','lng','name','borough','district'];
    getTable(infoRows, columns);
    $("#getData").addClass("selected");
}

function buildingsTable(){
    var columns  = ['borough', 'district', 'lat', 'lng'];
    getTable(buildings, columns);
    $("#getBuildingsData").addClass("selected");
}

function districtsTable(){
    var columns = ["id", "borough", "borocd", "score","distance","crimes"];
    getTable(districts, columns, function(row){
        addDistrict(row.id);
    });
    $("#getDistrictsData").addClass("selected");
    $("#districtsTableMessage").show();
}

var topCalculated = false;

function topDistrictsTable(){
    var columns = ["id", "borough", "borocd","score","distance","crimes","zscore"];
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
    getTable(districts, columns, function(row){
        addDistrict(row.id);
    });
    $("#top").addClass("selected");
    topCalculated = true;
}

function sortByColumn(tbody, column){
    var headers = $('table thead tr').children();
    headers.removeClass('aes');
    headers.removeClass('des');
    console.log(headers);
    var header = $('table thead tr').find('th:contains('+column+')');
    console.log(header);
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
    var tbody = $("table tbody").children();
    var count = $("table tbody tr").length;
    var pages = $("#paginateSelect").val();
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
    $("#tableSelector div button").removeClass("selected");
    $("#districtsTableMessage").hide();
    //http://bl.ocks.org/jfreels/6734025
    //http://bl.ocks.org/AMDS/4a61497182b8fcb05906
    //https://stackoverflow.com/questions/32871044/how-to-update-d3-table
    var table = d3.select("table");
    var thead = table.select('thead').select('tr');
    var tbody = table.select('tbody');
    thead = thead.selectAll('th')
    .data(columns)
    .text( function(column) { return column;})
    .on("click",function(column){sortByColumn(tbody,column)});

    thead.enter()
    .append('th')
    .text(function (column) { return column;})
    .on("click",function(column){sortByColumn(tbody,column)});

    thead.exit().remove();

    var rows = tbody.selectAll('tr')
    .data(data)
    .on("click", rowClick);

    rows.enter()
    .append('tr')
    .on("click", rowClick)
    .selectAll('td')
    .data( function(row){
        return columns.map( function(column){
            return {column: column, value: row[column]};
        });
    })
    .enter()
    .append('td')
    .text(function(d){return d.value;});

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
    //dataTable = $("table").DataTable();
}

function toLatLng(lat, lng){
    return {lat: lat, lng: lng};
}

//https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function distanceBetween(A, B){
    var lat1 = A.lat;
    var lon1 = A.lng;
    var lat2 = B.lat;
    var lon2 = B.lng;
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a))
}

//https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html
function isContained(point, poly){
    //return google.maps.geometry.poly.containsLocation(point, poly);
    //keep for fun, google maps api is probabily faster

    var c = false;
    var x = point.lat;
    var y = point.lng;
    var j = poly.length - 1;
    for (var i = 0; i < poly.length; i++) {
        if (  (poly[i].lng > y) != (poly[j].lng > y) &&  x < poly[i].lat + (poly[j].lat - poly[i].lat) * (y - poly[i].lng) / (poly[j].lng - poly[i].lng) ) {
            c = !c;
        }
        j = i;
    }
    return c;
}

function inDistrict(point, district){
    //return google.maps.geometry.poly.containsLocation(point, districts[district].polygon);
    if(districts[district].type == "MultiPolygon"){
        for (var j = 0; j < districts[district].path.length; j++) {
            if(isContained(point, districts[district].path[j])){
                return true;
            }
        }
    }else if (isContained(point, districts[district].path)){
        return true;
    }
    return false;
}

function findDistrict(point, borough){
    if(borough != undefined){
        var districts = boroughs[borough].districts;
        for (var j = 0; j < districts.length; j++) {
            if(inDistrict(point, districts[j])){
                return districts[j];
            }
        }
    }
    for (var i = 0; i < 71; i++) {
        if(inDistrict(point, i)){
            return i;
        }
    }
    return -1;
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      center: nyu
    });
    addMarker(nyu, "NYU");
    //map.data.loadGeoJson(NY_district_shapes_URL);
}

function getMarker(point, title){
    var marker = new google.maps.Marker({
      position: point,
      title: title,
    });
    markers.push(marker);
    return marker;
}

function addMarker(point, title){
    var marker = getMarker(point, title);
    marker.setMap(map);
}

function addPolyline(coords){
    var polyline = new google.maps.Polyline({
        path: coords,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    polyline.setMap(map);
}

function removeDistrict(a){
    if(isNaN(a) || a < 0 || a > 70){
        console.log("Bad removeDistrict");
        return;
    }
    districts[a].polygon.setMap(null);
    districts[a].center.setMap(null);
}

function removeBorough(a){
    if(isNaN(a) || a < 0 || a > 4){
        console.log("bad");
        return;
    }
    boroDistricts = boroughs[a].districts;
    for (var i = 0; i < boroDistricts.length; i++) {
        removeDistrict(boroDistricts[i]);
    }
}

function addDistrict(a){
    if(isNaN(a) || a < 0 || a > 70){
        console.log("Bad addDistrict");
        return;
    }
    if(drawOnlyHabitable && !districts[a].habitable){
        removeDistrict(a);
        return;
    }
    districts[a].polygon.setMap(map);
    if(drawMarkers){
        districts[a].center.setMap(map);
    }else{
        districts[a].center.setMap(null);
    }
}

function addBorough(a){
    if(isNaN(a) || a < 0 || a > 4){
        console.log("Borough No must be less than 6");
        return;
    }
    boroDistricts = boroughs[a].districts;
    for (var i = 0; i < boroDistricts.length; i++) {
        addDistrict(boroDistricts[i]);
    }
}

function clearBorders(){
    for (var i = 0; i < 71; i++) {
        removeDistrict(i);
    }
}

function clearMarkers(){
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

function checkDrawLimits(){
    drawOnlyHabitable = $("#drawCB1")[0].checked;
    drawMarkers = $("#drawCB2")[0].checked;
}

function addDistrictInput(){
    checkDrawLimits();
    var a = parseInt($("#districtNo").val());
    addDistrict(a-1);
}

function addBoroughInput(){
    checkDrawLimits();
    var a = parseInt($("#boroughNo").val());
    addBorough(a-1);
}

function addBoroughsCheckBoxes(){
    checkDrawLimits();
    var checkBoxes = $("#boroughCheckboxes input:checkbox").each(function(i){
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
    $("#neighborhoodTable").tableToCSV();
}

$("document").ready(function(){
    getData();
    //getBuildings();
    $("#getNYDistrictShape").click(addDistrictInput);
    $("#getNYBoroughShape").click(addBoroughInput);
    $("#addBoroughsCheckBoxes").click(addBoroughsCheckBoxes);
    $("#clearBorders").click(clearBorders);
    $("#getData").click(neighborhoodsTable);
    $("#getBuildingsData").click(buildingsTable);
    $("#getDistrictsData").click(districtsTable);
    $("#top").click(topDistrictsTable);
    $("#export").click(toCSV);
    $("#paginateSelect").change(paginate);

    URL = window.location.href;
})
