
function toLatLng(lat, lng){
    return {lat: lat, lng: lng};
}

//https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function distanceBetween(A, B){
    return 6371*d3.geoDistance([A.lng, A.lat], [B.lng, B.lat]);
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
    if(districts[district].type == 'MultiPolygon'){
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
        console.log('Bad removeDistrict');
        return;
    }
    districts[a].polygon.setMap(null);
    districts[a].center.setMap(null);
}

function removeBorough(a){
    if(isNaN(a) || a < 0 || a > 4){
        console.log('bad');
        return;
    }
    boroDistricts = boroughs[a].districts;
    boroughs[a].heatmap.setMap(null);
    for (var i = 0; i < boroDistricts.length; i++) {
        removeDistrict(boroDistricts[i]);
    }
}

function addDistrict(a){
    if(isNaN(a) || a < 0 || a > 70){
        console.log('Bad addDistrict');
        return;
    }
    if(drawOnlyHabitable && !districts[a].habitable){
        removeDistrict(a);
        return;
    }
    if(!districts[a].polygon.getMap()){
        districts[a].polygon.setMap(map);
    }
    if(drawMarkers){
        if(!districts[a].center.getMap()){
            districts[a].center.setMap(map);
        }
    }else{
        districts[a].center.setMap(null);
    }
}

function addBorough(a){
    if(isNaN(a) || a < 0 || a > 4){
        console.log('Borough No must be less than 6');
        return;
    }
    boroDistricts = boroughs[a].districts;
    for (var i = 0; i < boroDistricts.length; i++) {
        addDistrict(boroDistricts[i]);
    }
    if(drawCrimes){
        if(!boroughs[a].heatmap.getMap()){
            boroughs[a].heatmap.setMap(map);
        }
    }else{
        boroughs[a].heatmap.setMap(null);
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
