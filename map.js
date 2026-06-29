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

const datasets = [
    { 
        id: 'scheduled-monuments', 
        label: 'Scheduled Monuments', 
        data: null, 
        file: 'data/SM_Swansea_WGS84.geojson',
        style: { color: '#8B0000',
                weight: 1.5,
                fillColor: '#cc0000',
                fillOpacity: 0.25}
                },
    {   id: 'listed-buildings', 
        label: 'Listed Buildings', 
        data: null, 
        file: 'data/Listed_building_WGS84.geojson',
        type: 'point',
        style: { radius: 4,
        fillColor: "blue",
        color: "blue",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.25}
    },
    // add more here...
];



// Load and display datasets
datasets.forEach(dataset => {
    fetch(dataset.file)
    .then(r => r.json())
    .then(data => {
        dataset.data = data; // Save the data so it can be queried later
        L.geoJSON(data, {
            pointToLayer: dataset.type === 'point' 
                ? (feature, latlng) => L.circleMarker(latlng, dataset.style)
                : null,
            style: dataset.type !== 'point' ? dataset.style : null
        }).addTo(map);
    });
})



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
    if (datasets.some(d => !d.data)) return; // if data hasn't loaded yet, stop here

    datasets.forEach(dataset => {
        dataset.hits = dataset.data.features.filter(feature =>
        turf.booleanIntersects(drawnPolygon, feature) )
    })

    renderResults(datasets); 
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
function renderResults(datasets) {


    const panel = document.getElementById('results-panel'); // find the results panel div
    const summaryDiv = document.getElementById('summary')
        
    summaryDiv.innerHTML = datasets
    .filter(dataset => dataset.hits.length > 0)
    .map(dataset => `
        <div class="summary-item">
            <p>${dataset.label}: ${dataset.hits.length}</p>
            <div class="item-btns">    
                <button onClick="openModal('${dataset.id}')">More info</button>
                <a id="download">&#x2B07;</a>
            </div>
        </div>`)
    .join('');

    panel.classList.remove('hidden'); // removes hidden so panel becomes visible.
}


function openModal(datasetId) {
    const dataset = datasets.find(d => d.id === datasetId);
    const modalList = document.getElementById('modal-list');
    
    modalList.innerHTML = dataset.hits.map(f => buildFeatureList(f)).join('');
    
    document.getElementById('modal').classList.remove('hidden');
}

// find the close button and listen for a click, then run this function
document.getElementById('close-results').addEventListener('click', function () {
document.getElementById('results-panel').classList.add('hidden'); // add hidden class back to hide the panel
});

document.getElementById('close-modal').addEventListener('click', function() {
    document.getElementById('modal').classList.add('hidden');
});



