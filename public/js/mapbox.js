const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations)

mapboxgl.accessToken = 'pk.eyJ1Ijoia2hhbmduZ3V5ZW5kMTYiLCJhIjoiY204em51YWtkMGR0eTJrb2M4b2NwcHg2NSJ9.g3QdrLUwdwva7VBOVPtKTA';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v12', // style URL
    center: [-74.5, 40], // starting position [lng, lat]
    zoom: 9, // starting zoom
});