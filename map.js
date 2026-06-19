const map = L.map('map').setView([51.62, -3.94], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// leaflet draw
var drawControl = new L.Control.Draw();
map.addControl(drawControl);

var drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);

map.on("draw:created", function (e) {
   var type = e.layerType,
       layer = e.layer;
   drawnFeatures.addLayer(layer);
});