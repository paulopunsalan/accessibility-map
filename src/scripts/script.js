// has to load in "load" event because L isn't available

window.addEventListener("load", () => {
    var map = L.map("map").setView([14.198735, 121.148322], 13);

    var swBound = L.latLng(14.1862210, 121.1400188);
    var neBound = L.latLng(14.2084023, 121.1611839);
    var cityBounds = L.latLngBounds(swBound, neBound);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxNativeZoom: 19,
            maxZoom: 25,
        },
    ).addTo(map);

    map.setMinZoom(15);
    map.setMaxZoom(25);

    map.setMaxBounds(cityBounds);
    // map.on('drag', function() {
    //     map.panInsideBounds(cityBounds, { animate: false });
    // });

    function loadAccessiblePlaces() {
        var bounds = map.getBounds();
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();

        sw.lng = normalizeLng(sw.lng);
        ne.lng = normalizeLng(ne.lng);

        fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: `
            [out:json];
            (
                node["wheelchair"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["wheelchair"="limited"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["ramp"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["elevator"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["kerb"~"flush|lowered"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["amenity"="toilets"]["wheelchair"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["entrance"="main"]["wheelchair"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["tactile_paving"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
                node["highway"="steps"]["handrail"="yes"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
            );
            out body;
            `,
        })
            .then((res) => res.json())
            .then((data) => {
                markersLayer.clearLayers();

                data.elements.forEach(function (el) {
                    let emoji = "";
                    if (el.tags.wheelchair === "yes" || el.tags.wheelchair === "limited") emoji += '♿';
                    if (el.tags.ramp === "yes") emoji += '🔼';
                    if (el.tags["amenity"] === "toilets" && el.tags.wheelchair === "yes") emoji += '🚻';
                    if (el.tags.elevator === "yes") emoji += '🛗';
                    if (el.tags.tactile_paving === "yes") emoji += '👣';
                    if (el.tags.highway === "steps" && el.tags.handrail === "yes") emoji += '🪜';

                    createEmojiMarker(el.lat, el.lon, emoji, el.tags.name || "Accessible Feature");
                });
            })
            .catch(e => console.error(e));
    }

    var markersLayer = L.layerGroup().addTo(map);

    let loadTimeout;
    map.on("moveend", () => {
        if (map.getZoom() >= 15) {
            clearTimeout(loadTimeout);

            loadTimeout = setTimeout(() => {
                if (map.getZoom() >= 15) {
                    loadAccessiblePlaces();
                }
            }, 2000);
        } else {
            markersLayer.clearLayers();
        }
    });

    function createEmojiMarker(lat, lon, emoji, popupText) {
        var emojiIcon = L.divIcon({
            html: `<span class="marking">${emoji}</span>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 0]
        });

        L.marker([lat, lon], { icon: emojiIcon })
            .bindPopup(popupText)
            .addTo(markersLayer);
    }

    function normalizeLng(lng) {
        return ((lng + 180) % 360 + 360) % 360 - 180;
    }
});