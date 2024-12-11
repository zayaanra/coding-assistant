function updateDashboard(data) {
    // Update Data Written
    const dataWrittenElement = document.querySelector('.card h2');
    if (dataWrittenElement) {
        dataWrittenElement.textContent = `${(data.data_written / 1024).toFixed(2)} KB`;
    }

    // Update Languages Pie Chart
    const languageLabels = Object.keys(data.code_languages);
    const languageData = Object.values(data.code_languages);
    createPieChart(languageLabels, languageData);

    // Update Requests Bar Chart
    const requestLabels = Object.keys(data.requests);
    const requestData = Object.values(data.requests);
    createBarChart(requestLabels, requestData);
}

function createPieChart(labels, data) {
    const languagesCtx = document.getElementById('languagesChart').getContext('2d');
    new Chart(languagesCtx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Languages Used',
                data: data,
                backgroundColor: generateColors(labels.length),
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                }
            }
        }
    });
}

function createBarChart(labels, data) {
    const requestsCtx = document.getElementById('requestsChart').getContext('2d');
    new Chart(requestsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: data,
                backgroundColor: generateColors(labels.length),
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Request Types'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = ['#ffdd59', '#575fcf', '#ff3f34', '#0be881', '#00d8d6'];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}