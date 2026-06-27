const map = L.map('map').setView([51.62, -3.94], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let smData = null;
let lbData = null;

var listedBuildingStyle = {
    radius: 4,
    fillColor: "blue",
    color: "blue",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.25
};


// Load and display Scheduled Monuments layer
fetch('data/SM_Swansea_WGS84.geojson')
    .then(r => r.json())
    .then(data => {
        smData = data; // Save the data so it can be queried later
        L.geoJSON(data, {
            style: {
                color: '#8B0000',
                weight: 1.5,
                fillColor: '#cc0000',
                fillOpacity: 0.25
            }
        }).addTo(map); // add the data to the map
    });

// Load and display Listed Buildings layer
fetch('data/Listed_building_WGS84.geojson')
    .then(r => r.json())
    .then(data => {
        lbData = data; // Save the data so it can be queried later
        L.geoJSON(data, {
            pointToLayer: function (feature,latlng) {
                return L.circleMarker(latlng, listedBuildingStyle );
            }
        }).addTo(map); // add the data to the map
    });

// Draw toolbar — polygons only
var drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);

var drawControl = new L.Control.Draw({
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
    },
    edit: { featureGroup: drawnFeatures }
});
map.addControl(drawControl);

// map.on means listen for something to happen on the map.
// draw:created is the name of that something
// When user finishes drawing clear any old drawings, display the new one, then run spatial query.
map.on('draw:created', function (e) {
    drawnFeatures.clearLayers(); // clears the drawnFeatures container
    drawnFeatures.addLayer(e.layer); // e.layer is the shape just drawn, this line adds in into the drawnFeatures container
    runSpatialQuery(e.layer.toGeoJSON()); //toGeoJSON converts drawn shape into standard GeoJSON for tur.js. then passes it to runSpatialQuery
});

// drawnPolygon is the shape the user drew, passed in from the draw event
function runSpatialQuery(drawnPolygon) {
    if (!smData) return; // if the GeoJSON hasn't loaded yet, stop here

    // create a new list called hits
    // go through every scheduled monument in smData and keep only the ones that intersect the drawn polygon
    const hits = smData.features.filter(feature =>
        turf.booleanIntersects(drawnPolygon, feature) // returns true or false for each monument
    );

    renderResults(hits); // pass the hits list to the function that displays the results
}

// features is the hits list passed in from runSpatialQuery
function renderResults(features) {
    const panel = document.getElementById('results-panel'); // find the results panel div
    const list = document.getElementById('results-list'); // find the div where results will be listed

    if (features.length === 0) {
        // if no monuments were hit, show a message instead
        list.innerHTML = '<p class="no-results">No scheduled monuments intersect this area.</p>';
    } else {
        // map() loops through each feature and transforms it into a chunk of HTML
        // join('') converts the resulting list of HTML strings into one single string
        // innerHTML puts that string into the results div on the page
        list.innerHTML = features.map(f => {
            const p = f.properties; // shortcut so we can write p.Name instead of f.properties.Name
            return `
                <div class="result-item">
                    <h3>${p.Name.trim()}</h3>
                    <dl>
                        <dt>SAM Number</dt><dd>${p.SAMNumber.trim()}</dd>
                        <dt>Type</dt><dd>${p.SiteType}</dd>
                        <dt>Period</dt><dd>${p.Period}</dd>
                        <dt>Community</dt><dd>${p.Community}</dd>
                        <dt>Designated</dt><dd>${p.DesignationDate ? p.DesignationDate.slice(0, 10) : 'Unknown'}</dd>
                    </dl>
                    <a href="${p.Report}" target="_blank" rel="noopener">View Cadw Report &rarr;</a>
                </div>`;
        }).join(''); // converts the list into a single string with nothing between each item
    }

    panel.classList.remove('hidden'); // removes hidden so panel becomes visible.
}

// find the close button and listen for a click, then run this function
document.getElementById('close-results').addEventListener('click', function () {
    document.getElementById('results-panel').classList.add('hidden'); // add hidden class back to hide the panel
});
