const locationInput = document.getElementById('location-input');
const dateInput = document.getElementById('date-input');
const timeHourInput = document.getElementById('time-hour-input'); // Added for completeness
const submitBtn = document.getElementById('submit-btn');
const resultsDiv = document.getElementById('results-div');
const coordsDisplay = document.getElementById('coords-display');
const body = document.body;

let barChart, doughnutChart; // ✨ Variables for Chart.js instances
let map, marker; // ✨ Variables for Leaflet map
let currentCoords = null; // ✨ Store the selected coordinates

const THRESHOLD_RAIN = 1.0; // mm/day
const THRESHOLD_HOT = 32.0; // Celsius
const THRESHOLD_WINDY = 15.0; // km/h

// ✨ Re-instating OpenCage for location search
async function getCoordsFromLocation(locationName) {
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(locationName)}&key=${OPENCAGE_API_KEY}&limit=1`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry;
            return { lat, lon: lng };
        } else {
            return { error: "Could not find coordinates for this location." };
        }
    } catch (error) {
        console.error("Geocoding API error:", error);
        return { error: "Failed to fetch coordinates." };
    }
}

// ✨ New function for reverse geocoding (coords -> location name)
async function getLocationFromCoords(lat, lon) {
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPENCAGE_API_KEY}&limit=1`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].formatted;
        }
        return "Unknown location";
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return "Could not fetch location name";
    }
}

async function fetchNASAData(year, month, day, lat, lon) {
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const startDate = `${year}${monthStr}${dayStr}`;
    const endDate = startDate;
    
    const parameters = "PRECTOTCORR,T2M,WS10M"; // Rain, Temp, Wind

    const apiUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=ag&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=json&api_key=${NASA_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return { error: `NASA API Warning for year ${year}: ${response.statusText}` };
        }
        const data = await response.json();
        const params = data?.properties?.parameter;
        
        const precipitation = params?.PRECTOTCORR?.[startDate];
        const temperature = params?.T2M?.[startDate];
        const windSpeed = params?.WS10M?.[startDate];

        if ([precipitation, temperature, windSpeed].some(val => val === undefined || val <= -999)) {
            return { error: `Missing data for year ${year}` };
        }
        
        const windSpeedKmh = windSpeed * 3.6;
        return { precipitation, temperature, windSpeed: windSpeedKmh };
    } catch (error) {
        return { error: `Error fetching data for year ${year}: ${error}` };
    }
}

async function calculateHistoricalProbabilities(lat, lon, month, day) {
    const startYear = 2001;
    const endYear = 2020;
    
    let rainyDayCount = 0, hotDayCount = 0, windyDayCount = 0;
    const historicalData = { rain: [], temp: [], wind: [] };

    const yearPromises = [];
    for (let year = startYear; year <= endYear; year++) {
        yearPromises.push(fetchNASAData(year, month, day, lat, lon));
    }

    const yearlyResults = await Promise.all(yearPromises);
    
    let totalYearsAnalyzed = 0;
    for (const data of yearlyResults) {
        if (!data.error) {
            totalYearsAnalyzed++;
            historicalData.rain.push(data.precipitation);
            historicalData.temp.push(data.temperature);
            historicalData.wind.push(data.windSpeed);

            if (data.precipitation > THRESHOLD_RAIN) rainyDayCount++;
            if (data.temperature > THRESHOLD_HOT) hotDayCount++;
            if (data.windSpeed > THRESHOLD_WINDY) windyDayCount++;
        } else {
            historicalData.rain.push(0);
            historicalData.temp.push(0);
            historicalData.wind.push(0);
        }
    }
    
    if (totalYearsAnalyzed === 0) {
         return { error: "Could not retrieve any historical data. The location might be over water." };
    }
    
    return {
        chance_of_rain: Math.round((rainyDayCount / totalYearsAnalyzed) * 100),
        chance_of_heat: Math.round((hotDayCount / totalYearsAnalyzed) * 100),
        chance_of_wind: Math.round((windyDayCount / totalYearsAnalyzed) * 100),
        analysis_period_years: totalYearsAnalyzed,
        historical_data: historicalData,
    };
}

// ✨ Upgraded display logic
function displayResults(data) {
    // Define levels for coloring and background
    const getRainStyle = (p) => p > 60 ? 'high' : p > 30 ? 'moderate' : 'low';
    const getHeatStyle = (p) => p > 60 ? 'high' : p > 30 ? 'moderate' : 'low';
    const getWindStyle = (p) => p > 40 ? 'high' : p > 20 ? 'moderate' : 'low';

    const rainStyle = getRainStyle(data.chance_of_rain);
    const heatStyle = getHeatStyle(data.chance_of_heat);
    const windStyle = getWindStyle(data.chance_of_wind);

    // Calculate overall adverse probability
    const pA = data.chance_of_heat / 100;
    const pB = data.chance_of_rain / 100;
    const pC = data.chance_of_wind / 100;
    const probAnyAdverse = Math.round((1 - (1 - pA) * (1 - pB) * (1 - pC)) * 100);

    // 9a. Update metric cards
    document.getElementById('prob-high-temp').textContent = `${data.chance_of_heat}%`;
    document.getElementById('prob-heavy-rain').textContent = `${data.chance_of_rain}%`;
    document.getElementById('prob-strong-wind').textContent = `${data.chance_of_wind}%`;
    document.getElementById('prob-any-adverse').textContent = `${probAnyAdverse}%`;

    // 9b. Update Bar Chart
    barChart.data.datasets[0].data = [data.chance_of_heat, data.chance_of_rain, data.chance_of_wind];
    barChart.update();

    // 9c. Update Doughnut Chart
    const clearRisk = 100 - probAnyAdverse;
    doughnutChart.data.datasets[0].data = [probAnyAdverse, clearRisk];
    doughnutChart.update();

    resultsDiv.classList.add('visible');
}

function initCharts() {
    // Configuration options for Chart.js to match the dark theme
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: 'var(--text-color)' }
            },
            tooltip: {
                 callbacks: {
                    label: (context) => `${context.label}: ${context.raw}%`
                }
            }
        },
        scales: {
            y: {
                max: 100,
                min: 0,
                title: {
                    display: true,
                    text: '% Probability',
                    color: 'var(--text-color)'
                },
                ticks: { color: 'var(--text-color)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: {
                ticks: { color: 'var(--text-color)' },
                grid: { display: false }
            }
        }
    };

    // Bar Chart Setup
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['High Temp', 'Heavy Rain', 'Strong Wind'],
            datasets: [{
                label: 'Probability (%)',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.8)', // Orange
                    'rgba(54, 162, 235, 0.8)', // Blue
                    'rgba(75, 192, 192, 0.8)' // Teal
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                 ...chartOptions.plugins,
                 title: {
                    display: true,
                    text: 'Specific Event Probabilities',
                    color: 'var(--text-color)',
                    font: { size: 16 }
                },
                legend: { display: false }
            },
        }
    });

    // Doughnut Chart Setup
    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
    doughnutChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Adverse Risk', 'Clear Risk'],
            datasets: [{
                label: 'Overall Risk (%)',
                data: [0, 100], 
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)', // Red for Risk
                    'rgba(200, 200, 200, 0.3)' // Grey for Clear
                ],
                borderColor: 'var(--text-color)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Overall Adverse Risk',
                    color: 'var(--text-color)',
                    font: { size: 16 }
                },
                legend: {
                    position: 'bottom',
                    labels: { color: 'var(--text-color)' }
                }
            }
        }
    });
}


async function updateCoords(lat, lon, updateInput = true) {
    currentCoords = { lat, lon };
    coordsDisplay.textContent = `Selected: Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
    coordsDisplay.style.color = 'var(--success-color)';

    if (updateInput) {
        const locationName = await getLocationFromCoords(lat, lon);
        locationInput.value = locationName;
    }
}

// ✨ New initMap function for Leaflet and OpenStreetMap
async function initMap() {
    const defaultCoords = { lat: 34.0522, lon: -118.2437 }; // Default: Los Angeles, CA
    currentCoords = defaultCoords;
    map = L.map('map').setView([defaultCoords.lat, defaultCoords.lon], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add a draggable marker
    marker = L.marker([defaultCoords.lat, defaultCoords.lon]).addTo(map)
        .bindPopup("Selected Location").openPopup();

    // Update coordinates display when marker is dragged
    map.on('click', async function(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        
        marker.setLatLng(e.latlng);
        await updateCoords(lat, lon);
    });

    // Also handle marker drag
    marker.on('dragend', async (event) => {
        const { lat, lng } = event.target.getLatLng();
        await updateCoords(lat, lng);
    })

    // Set initial coordinates
    await updateCoords(defaultCoords.lat, defaultCoords.lon);
}

async function handleSearch(locationName) {
    if (!locationName) return;

    // Clear previous results to avoid confusion while searching
    coordsDisplay.textContent = 'Finding coordinates...';
    coordsDisplay.style.color = 'var(--text-color)';

    const coords = await getCoordsFromLocation(locationName);

    if (coords.error) {
        coordsDisplay.textContent = coords.error;
        coordsDisplay.style.color = 'var(--danger-color)';
        return;
    }

    const newLatLng = L.latLng(coords.lat, coords.lon);
    map.setView(newLatLng, 12);
    marker.setLatLng(newLatLng);
    // We pass `false` here to prevent the reverse geocoder from overwriting the user's search term
    await updateCoords(coords.lat, coords.lon, false);
}

function resetResultsUI() {
    // Reset metric cards to their initial state
    document.getElementById('prob-high-temp').textContent = '--';
    document.getElementById('prob-heavy-rain').textContent = '--';
    document.getElementById('prob-strong-wind').textContent = '--';
    document.getElementById('prob-any-adverse').textContent = '--';

    // Reset charts to their initial state
    barChart.data.datasets[0].data = [0, 0, 0];
    doughnutChart.data.datasets[0].data = [0, 100];
    barChart.update();
    doughnutChart.update();
}

async function handleSubmit() {
    const dateValue = dateInput.value;
    const hourValue = timeHourInput.value;

    // First, secure the API keys
    if (typeof NASA_API_KEY === 'undefined' || typeof OPENCAGE_API_KEY === 'undefined' || NASA_API_KEY.includes("YOUR") || OPENCAGE_API_KEY.includes("YOUR")) {
        alert("Please add your API keys to the script to begin.");
        resultsDiv.classList.add('visible');
        return;
    }

    // No need to call handleSearch() here, currentCoords is the source of truth

    if (!currentCoords || !dateValue || hourValue === "") {
        alert("Please ensure a location is selected and date/time are filled in.");
        resultsDiv.classList.add('visible');
        return;
    }

    // Reset the UI to clear old data before showing the loader
    resetResultsUI();

    // Show a loader inside the results container without destroying its structure
    const loader = document.createElement('div');
    loader.className = 'loader';
    resultsDiv.prepend(loader); // Add loader at the beginning

    resultsDiv.classList.add('visible');
    // body.className = ''; // This is not used in the current CSS

    const date = new Date(dateValue);
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const resultData = await calculateHistoricalProbabilities(currentCoords.lat, currentCoords.lon, month, day);
    
    resultsDiv.removeChild(loader); // Remove the loader

    if (resultData.error) {
         alert(resultData.error);
         // Optionally display the error message in a specific place if you add one
    } else {
        displayResults(resultData);
    }
}

submitBtn.addEventListener('click', handleSubmit);

// ✨ Add event listener to search when user presses Enter in the location input
locationInput.addEventListener('change', (e) => {
    if (e.target.value.trim() !== "") {
        handleSearch(e.target.value.trim());
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // Set initial date to today
    dateInput.value = new Date().toISOString().split('T')[0];
    
    await initMap(); // Initialize the Leaflet map
    initCharts(); // Initialize the charts
});