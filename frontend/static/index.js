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

    // Process Requests Data for Weekdays
    const requestLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const requestTypes = ['refactor_code', 'code_completion', 'doc_string'];
    const requestData = requestTypes.map(type =>
        requestLabels.map(day => (data.requests[day]?.[type] || 0))
    );

    // Update Requests Bar Chart
    createBarChart(requestLabels, requestData, requestTypes);
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

function createBarChart(labels, data, requestTypes) {
    const requestsCtx = document.getElementById('requestsChart').getContext('2d');
    const datasets = requestTypes.map((type, index) => ({
        label: type.replace('_', ' ').toUpperCase(),
        data: data[index],
        backgroundColor: generateColors(requestTypes.length)[index]
    }));

    new Chart(requestsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
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
                        text: 'Weekdays'
                    },
                    stacked: false // Ensure bars are grouped, not stacked
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    stacked: false // Ensure bars are grouped, not stacked
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = ['#ffdd59', '#575fcf', '#ff3f34', '#0be881', '#00d8d6'];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}
