const map = L.map('map').setView([51.62, -3.94], 12);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var baseMaps = {
    "OpenStreetMap": osm,
}

// Create empty layer groups upfront so they can be referenced in the layer control
let sm = L.layerGroup().addTo(map);
let lb = L.layerGroup().addTo(map);

let overlayMaps = {
    "Scheduled Monuments": sm,
    "Listed Buildings": lb
}

var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

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
        }).addTo(sm); // add into the sm layer group
    });

// Load and display Listed Buildings layer
fetch('data/Listed_building_WGS84.geojson')
    .then(r => r.json())
    .then(data => {
        lbData = data; // Save the data so it can be queried later
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, listedBuildingStyle);
            }
        }).addTo(lb); // add into the lb layer group
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
    if (!smData || !lbData) return; // if the sm or '||' lb GeoJSON hasn't loaded yet, stop here

    // create a new list called hits
    // go through every scheduled monument in smData and keep only the ones that intersect the drawn polygon
    const smHits = smData.features.filter(feature =>
        turf.booleanIntersects(drawnPolygon, feature) // returns true or false for each monument
    );
    const lbHits = lbData.features.filter(feature => 
        turf.booleanIntersects(drawnPolygon, feature)
    );

    renderResults(smHits, lbHits); // pass sm and lb hits separately to renderResults
}


function openFeature(evt, featureType) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(featureType).style.display = "block";
  evt.currentTarget.className += " active";
}

function buildFeatureList(f) {
    const p = f.properties; 
    const isSM = p.SAMNumber !== undefined
    if (isSM) {
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
        } else {
            return `
            <div class="result-item">
                <h3>${p.Name.trim()}</h3>
                <dl>
                    <dt>Grade</dt><dd>${p.Grade}</dd>
                    <dt>Community</dt><dd>${p.Community}</dd>
                    <dt>Designated</dt><dd>${p.DesignationDate ? p.DesignationDate.slice(0, 10) : 'Unknown'}</dd>
                </dl>
                <a href="${p.Report}" target="_blank" rel="noopener">View Cadw Report &rarr;</a>
            </div>`;
        }
    }


// features is the hits list passed in from runSpatialQuery
function renderResults(smFeatures, lbFeatures) {
    const panel = document.getElementById('results-panel'); // find the results panel div
    const smList = document.getElementById('scheduled-monuments'); // find the div where results will be listed
    const lbList = document.getElementById('listed-buildings'); // find the div where results will be listed

    if (smFeatures.length === 0) {
        // if no monuments were hit, show a message instead
        smList.innerHTML = '<p class="no-results">No assets intersect this area.</p>';
    } else {
        smList.innerHTML = smFeatures.map(f => buildFeatureList(f)).join('');
    }

    if (lbFeatures.length === 0) {
        // if no monuments were hit, show a message instead
        lbList.innerHTML = '<p class="no-results">No assets intersect this area.</p>';
    } else {
        lbList.innerHTML = lbFeatures.map(f => buildFeatureList(f)).join('');
    }


    panel.classList.remove('hidden'); // removes hidden so panel becomes visible.
}

// find the close button and listen for a click, then run this function
document.getElementById('close-results').addEventListener('click', function () {
document.getElementById('results-panel').classList.add('hidden'); // add hidden class back to hide the panel
});
