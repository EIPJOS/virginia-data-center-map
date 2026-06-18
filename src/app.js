import { dataCenters, sourceNotes } from "./data/datacenters.js";

const statusColors = {
  Existing: "#8fb3ff",
  "Under Construction": "#65f0b4",
  Proposed: "#ddff3f"
};

const state = {
  county: "all",
  status: "all",
  operator: "all",
  visibleStatuses: new Set(["Existing", "Under Construction", "Proposed"]),
  selectedId: null
};

const formatNumber = new Intl.NumberFormat("en-US");
const formatMw = (mw) => `${formatNumber.format(Math.round(mw))} MW`;

const countyFilter = document.querySelector("#countyFilter");
const statusFilter = document.querySelector("#statusFilter");
const operatorFilter = document.querySelector("#operatorFilter");
const resetFilters = document.querySelector("#resetFilters");
const layerToggles = document.querySelectorAll("[data-layer]");

const map = L.map("map", {
  zoomControl: false,
  attributionControl: true
}).setView([38.55, -77.65], 7);

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap &copy; <a href="https://carto.com/">CARTO</a>'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
let countyChart;
let statusChart;

function uniqueValues(key) {
  return [...new Set(dataCenters.map((item) => item[key]))].sort();
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function getFilteredData() {
  return dataCenters.filter((item) => {
    const countyMatch = state.county === "all" || item.county === state.county;
    const statusMatch = state.status === "all" || item.status === state.status;
    const operatorMatch = state.operator === "all" || item.operator === state.operator;
    const layerMatch = state.visibleStatuses.has(item.status);
    return countyMatch && statusMatch && operatorMatch && layerMatch;
  });
}

function markerIcon(item) {
  const color = statusColors[item.status] || "#ffffff";
  const size = Math.max(18, Math.min(46, item.estimatedMw / 10));
  return L.divIcon({
    className: "dc-marker",
    html: `<span style="--marker-color:${color}; width:${size}px; height:${size}px"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function renderMarkers(items) {
  markerLayer.clearLayers();

  items.forEach((item) => {
    const marker = L.marker([item.latitude, item.longitude], {
      icon: markerIcon(item),
      title: item.name
    });

    marker.bindTooltip(`${item.name} - ${formatMw(item.estimatedMw)}`, {
      direction: "top",
      offset: [0, -8],
      opacity: 0.96
    });

    marker.on("click", () => {
      state.selectedId = item.id;
      renderInspector(item);
    });

    markerLayer.addLayer(marker);
  });

  if (items.length > 0) {
    const bounds = L.latLngBounds(items.map((item) => [item.latitude, item.longitude]));

    requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds.pad(0.16), {
        animate: false,
        maxZoom: items.length === 1 ? 10 : 9
      });
    });
  }
}

function renderMetrics(items) {
  const totalMw = items.reduce((sum, item) => sum + item.estimatedMw, 0);
  const counties = new Set(items.map((item) => item.county));
  const proposedCount = items.filter((item) => item.status === "Proposed").length;
  const score = Math.min(99, Math.round((totalMw / 32) + proposedCount * 5 + counties.size * 2));

  document.querySelector("#totalFacilities").textContent = formatNumber.format(items.length);
  document.querySelector("#totalMw").textContent = formatMw(totalMw);
  document.querySelector("#countyCount").textContent = counties.size;
  document.querySelector("#pressureScore").textContent = score;

  const topCounty = [...counties]
    .map((county) => ({
      county,
      mw: items.filter((item) => item.county === county).reduce((sum, item) => sum + item.estimatedMw, 0)
    }))
    .sort((a, b) => b.mw - a.mw)[0];

  document.querySelector("#hotspotLabel").textContent = topCounty ? `${topCounty.county} corridor` : "No active filters";
}

function groupCount(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function groupMw(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + item.estimatedMw;
    return acc;
  }, {});
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#10141f",
        borderColor: "#2a3143",
        borderWidth: 1,
        titleColor: "#f6f8ff",
        bodyColor: "#b9c0d4"
      }
    },
    scales: {
      x: {
        ticks: { color: "#8e96aa" },
        grid: { color: "rgba(255,255,255,0.05)" }
      },
      y: {
        ticks: { color: "#8e96aa" },
        grid: { color: "rgba(255,255,255,0.05)" }
      }
    }
  };
}

function renderCharts(items) {
  const countyData = groupCount(items, "county");
  const statusData = groupMw(items, "status");

  countyChart?.destroy();
  statusChart?.destroy();

  countyChart = new Chart(document.querySelector("#countyChart"), {
    type: "bar",
    data: {
      labels: Object.keys(countyData),
      datasets: [{
        data: Object.values(countyData),
        backgroundColor: "#ddff3f",
        borderRadius: 6
      }]
    },
    options: chartOptions()
  });

  statusChart = new Chart(document.querySelector("#statusChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [{
        data: Object.values(statusData),
        backgroundColor: Object.keys(statusData).map((status) => statusColors[status]),
        borderColor: "#0c0f16",
        borderWidth: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#b9c0d4", boxWidth: 10, usePointStyle: true }
        }
      }
    }
  });
}

function renderInspector(item) {
  document.querySelector("#facilityName").textContent = item.name;
  document.querySelector("#facilityDetails").innerHTML = `
    <div><dt>Operator</dt><dd>${item.operator}</dd></div>
    <div><dt>Location</dt><dd>${item.city}, ${item.county} County</dd></div>
    <div><dt>Status</dt><dd>${item.status}</dd></div>
    <div><dt>Estimated Demand</dt><dd>${formatMw(item.estimatedMw)}</dd></div>
    <div><dt>Estimated Size</dt><dd>${formatNumber.format(item.sqft)} sq ft</dd></div>
    <div><dt>Notes</dt><dd>${item.notes}</dd></div>
  `;

  const sourceLink = document.querySelector("#sourceLink");
  sourceLink.href = item.sourceUrl;
  sourceLink.classList.remove("hidden");
}

function renderWatchlist(items) {
  const totalMw = items.reduce((sum, item) => sum + item.estimatedMw, 0);
  const proposedMw = items
    .filter((item) => item.status === "Proposed")
    .reduce((sum, item) => sum + item.estimatedMw, 0);

  const list = [
    `Filtered portfolio represents ${formatMw(totalMw)} of modeled data center demand.`,
    `${formatMw(proposedMw)} is tagged as proposed and should be monitored for permitting and utility planning.`,
    "Next live-data milestone: add PJM load and price snapshots for Virginia-relevant grid context.",
    sourceNotes[2]
  ];

  document.querySelector("#watchlist").innerHTML = list.map((item) => `<li>${item}</li>`).join("");
}

function render() {
  const items = getFilteredData();
  renderMarkers(items);
  renderMetrics(items);
  renderCharts(items);
  renderWatchlist(items);

  const selected = dataCenters.find((item) => item.id === state.selectedId);
  if (selected && items.includes(selected)) {
    renderInspector(selected);
  }
}

function setUpdatedTime() {
  const now = new Date();
  document.querySelector("#lastUpdated").textContent = `Updated ${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

fillSelect(countyFilter, uniqueValues("county"));
fillSelect(statusFilter, uniqueValues("status"));
fillSelect(operatorFilter, uniqueValues("operator"));

countyFilter.addEventListener("change", (event) => {
  state.county = event.target.value;
  render();
});

statusFilter.addEventListener("change", (event) => {
  state.status = event.target.value;
  render();
});

operatorFilter.addEventListener("change", (event) => {
  state.operator = event.target.value;
  render();
});

layerToggles.forEach((toggle) => {
  toggle.addEventListener("change", (event) => {
    const status = event.target.dataset.layer;
    if (event.target.checked) {
      state.visibleStatuses.add(status);
    } else {
      state.visibleStatuses.delete(status);
    }
    render();
  });
});

resetFilters.addEventListener("click", () => {
  state.county = "all";
  state.status = "all";
  state.operator = "all";
  countyFilter.value = "all";
  statusFilter.value = "all";
  operatorFilter.value = "all";
  layerToggles.forEach((toggle) => {
    toggle.checked = true;
    state.visibleStatuses.add(toggle.dataset.layer);
  });
  render();
});

setUpdatedTime();
render();
