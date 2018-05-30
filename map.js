function codeAddress(address, i){
    var LatLng;
    geocoder.geocode({'address': address}, function(results,status){
        console.log('i: ' + i)
        if(status == 'OK'){
            LatLng = results[0].geometry.location;
            console.log(LatLng.lat());
        }else{
            console.log('error');
            console.log(status);
        }
    });
    return LatLng;
}


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

    var c = false,
    x = point.lat,
    y = point.lng,
    j = poly.length - 1;
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


function getMarker(point, title, icon){
    var marker;
    var path = 'M50 50l-.015-25.059c0-13.781-11.186-24.946-24.967-24.946-13.781 0-24.967 11.173-24.967 24.955l.201 25.085 5.748-.014v-25.07c0-10.741 8.262-19.447 19-19.447 10.74 0 19 8.707 19 19.448v25.048h6zm-16.803-9.074l-.092-.168.048-.062.044-.062c.86-.355 1.641-.79 2.339-1.31.698-.522 1.106-1.286 1.348-2.296.027-.117.116-.389.116-.804v-20.853c0-.503-.089-1.025-.387-1.556-.296-.54-.637-1.023-1.09-1.452-.439-.425-.921-.721-1.472-1.006-.55-.282-1.064-.357-1.571-.357h-14.922c-.476 0-.988.067-1.54.335-.551.267-1.058.577-1.516.995-.459.413-.798.865-1.096 1.382-.294.527-.406 1.018-.406 1.528v21.164c0 .353.054.728.228 1.11.179.389.381.752.648 1.088.268.348.549.661.862.941.312.282.608.512.908.688.145.061.403.154.777.271.369.119.539.19.511.246l-6.105 9.252h3.561l4.458-6h12.302l4.452 6h3.606l-6.011-9.074zm-13.197-27.926c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1h-8c-.55 0-1-.45-1-1v-1zm-3.936 4.885c.133-.282.237-.538.444-.779.211-.238.422-.58.703-.729.281-.15.54-.377.837-.377h13.857c.267 0 .532.215.801.328.268.12.512.363.737.569.222.207.31.472.448.709.131.232.109.526.109.793v4.724c0 .27.013.521-.133.775-.148.26-.298.484-.538.677-.239.189-.466.238-.733.353-.268.126-.514.072-.778.072h-13.681c-.033 0-.107.093-.225.069l-.27-.039c-.503-.088-.812-.329-1.2-.775-.385-.449-.442-.907-.442-1.443v-4.054c0-.297-.068-.589.064-.873zm3.787 19.275c-.459.475-1.034.712-1.714.712-.683 0-1.241-.237-1.673-.712-.432-.474-.646-1.058-.646-1.739 0-.624.225-1.165.669-1.624.445-.462.996-.693 1.65-.693.68 0 1.254.219 1.714.643.461.438.692 1.002.692 1.721 0 .654-.231 1.219-.692 1.692zm10.203 0c-.458-.474-.689-1.058-.689-1.739 0-.686.243-1.237.734-1.675.493-.424 1.063-.643 1.72-.643.678 0 1.236.231 1.666.693.433.459.649 1 .649 1.624 0 .682-.221 1.266-.671 1.739-.444.475-1.009.712-1.693.712-.683.001-1.253-.236-1.716-.711z';
    if(icon != undefined){
        var icon = {
            path: path,
            fillColor: '#FFF',
            fillOpacity: .6,
            anchor: new google.maps.Point(0,0),
            strokeWeight: 0,
            scale: 1
        }
        marker = new google.maps.Marker({
            position: point,
            title: title,
            icon: icon
        });
    }else{
        marker = new google.maps.Marker({
            position: point,
            title: title,
        });
    }
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
    var boroughCBS = $('#boroughCheckboxes input').each(function(i,a){
        if(this.checked){
            $(this).click();
        }else{
            removeBorough(i);
        }
    });
}

function clearMarkers(){
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}
