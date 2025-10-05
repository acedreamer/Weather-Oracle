# Adverse Weather Oracle

A web application that calculates the historical probability of adverse weather events for any location on a specific date, using over 20 years of NASA satellite data.

<!-- Add your live demo link here -->
<!-- **[Live Demo](https://weather-oracle.vercel.app/)** -->

 <!-- Replace with a link to your app's screenshot -->

## Features

*   **Historical Probability Analysis**: Calculates the chance of high temperatures, heavy rain, and strong winds based on historical data.
*   **20+ Years of Data**: Leverages the NASA POWER Project API for daily weather data from 2001 to 2020.
*   **Interactive Map**: Uses Leaflet.js to allow users to select a precise location by clicking the map or dragging a marker.
*   **Location Search**: Integrates the OpenCage Geocoding API to convert city/place names into geographic coordinates.
*   **Dynamic Data Visualization**: Displays results with responsive and easy-to-read charts powered by Chart.js.
*   **Modern UI**: Features a clean, responsive, and glassmorphism-inspired design.

## Technologies Used

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **APIs**:
    *   [NASA POWER API](https://power.larc.nasa.gov/): For historical weather data.
    *   [OpenCage Geocoding API](https://opencagedata.com/): For converting location names to coordinates.
*   **Libraries**:
    *   [Chart.js](https://www.chartjs.org/): For creating charts.
    *   [Leaflet.js](https://leafletjs.com/): For the interactive map.

## Local Setup and Installation

To run this project on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/acedreamer/Weather-Oracle.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd Weather-Oracle
    ```

3.  **Create a `config.js` file:**
    In the root of the project, create a new file named `config.js`. This file is listed in `.gitignore` to keep your API keys private.

4.  **Add your API keys to `config.js`:**
    Open `config.js` and add your keys from NASA and OpenCage.
    ```javascript
    // config.js
    const NASA_API_KEY = "YOUR_NASA_API_KEY";
    const OPENCAGE_API_KEY = "YOUR_OPENCAGE_API_KEY";
    ```

5.  **Open the application:**
    Simply open the `index.html` file in your web browser.

## Deployment

This project is designed for easy deployment on platforms like Vercel or Netlify.

1.  **Push your project to GitHub.**

2.  **Import the repository** into your Vercel or Netlify account.

3.  **Configure the deployment settings:**

    *   **Environment Variables**:
        In your project settings, add the following environment variables. The platform will use these to create the `config.js` file securely during the build process.
        *   `NASA_API_KEY` = `your_actual_nasa_key`
        *   `OPENCAGE_API_KEY` = `your_actual_opencage_key`

    *   **Build Command**:
        Set the build command to the following. This command writes the environment variables into a `config.js` file on the server.
        ```bash
        echo "const NASA_API_KEY='${NASA_API_KEY}'; const OPENCAGE_API_KEY='${OPENCAGE_API_KEY}';" > config.js
        ```

    *   **Output Directory**:
        Leave the "Output Directory" field **empty**. This tells the platform to serve the files from the project's root directory.

4.  **Deploy!** Your site will be built and deployed with the API keys securely configured.

## Acknowledgements

*   Data provided by the NASA POWER Project.
*   Geocoding services provided by OpenCage.
*   Fonts from Google Fonts.