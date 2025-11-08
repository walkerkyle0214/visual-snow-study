const gameImage = document.getElementById('gameImage');
const coordinatesDisplay = document.getElementById('coordinates');
const polygonInfo = document.getElementById('polygonInfo');
const polygonSvg = document.getElementById('polygonSvg');
const currentPolygon = document.getElementById('currentPolygon');
const clearBtn = document.getElementById('clearBtn');
const finishBtn = document.getElementById('finishBtn');
const modeToggle = document.getElementById('modeToggle');
const clearAllBtn = document.getElementById('clearAllBtn');
const storedPolygonsGroup = document.getElementById('storedPolygons');
const saveSetBtn = document.getElementById('saveSetBtn');
const refreshSetsBtn = document.getElementById('refreshSetsBtn');
const setNameInput = document.getElementById('setName');
const setDescriptionInput = document.getElementById('setDescription');
const setsContainer = document.getElementById('setsContainer');

// Results section elements
const coordsNavBtn = document.getElementById('coordsNavBtn');
const resultsNavBtn = document.getElementById('resultsNavBtn');
const coordsSection = document.getElementById('coordsSection');
const resultsSection = document.getElementById('resultsSection');
const studyContent = document.getElementById('studyContent');
const loadResultsBtn = document.getElementById('loadResultsBtn');
const exportResultsBtn = document.getElementById('exportResultsBtn');
const resultsCount = document.getElementById('resultsCount');
const imageModeFilter = document.getElementById('imageModeFilter');
const usernameFilter = document.getElementById('usernameFilter');
const resultsTableBody = document.getElementById('resultsTableBody');

let polygonPoints = [];
let isDrawingPolygon = false;
let polygonCounter = 1;
let storedPolygons = window.storedCoordinates || [];
let polygonSets = window.polygonSets || {};
let isOverlayMode = false;
let currentResults = [];

// Set initial counter based on existing data
if (storedPolygons.length > 0) {
    polygonCounter = Math.max(...storedPolygons.map(p => p.id || 0)) + 1;
}

function getImageCoordinates(event) {
    const rect = gameImage.getBoundingClientRect();
    
    // Get click position relative to the image
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Direct 1:1 mapping since image is exactly 800x600
    return {
        x: Math.round(clickX),
        y: Math.round(clickY)
    };
}

function updatePolygonDisplay() {
    const pointsString = polygonPoints.map(point => `${point.x},${point.y}`).join(' ');
    currentPolygon.setAttribute('points', pointsString);
    
    if (polygonPoints.length > 0) {
        const pointsText = polygonPoints.map(p => `(${p.x},${p.y})`).join(', ');
        polygonInfo.textContent = `Polygon points: ${pointsText}`;
    } else {
        polygonInfo.textContent = 'Polygon: Not set';
    }
}

function updateSvgSize() {
    // Fixed dimensions - no scaling needed
    const width = 800;
    const height = 600;
    
    polygonSvg.style.width = width + 'px';
    polygonSvg.style.height = height + 'px';
    polygonSvg.style.left = '0px';
    polygonSvg.style.top = '0px';
    polygonSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    polygonSvg.setAttribute('width', width);
    polygonSvg.setAttribute('height', height);
    
    console.log(`Admin SVG updated: ${width}x${height} (fixed)`);
}

gameImage.addEventListener('load', updateSvgSize);

// Initial setup
updateSvgSize();

gameImage.addEventListener('click', function(event) {
    if (isOverlayMode) return;
    
    event.preventDefault();
    const coords = getImageCoordinates(event);
    
    if (polygonPoints.length >= 3) {
        const firstPoint = polygonPoints[0];
        const distance = Math.sqrt(Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2));
        
        if (distance <= 10) {
            isDrawingPolygon = false;
            finishBtn.disabled = true;
            coordinatesDisplay.textContent = `Polygon completed with ${polygonPoints.length} points`;
            storePolygon();
            return;
        }
    }
    
    polygonPoints.push(coords);
    isDrawingPolygon = true;
    updatePolygonDisplay();
    
    coordinatesDisplay.textContent = `Point ${polygonPoints.length}: (${coords.x}, ${coords.y}) | Click to add more points`;
    
    if (polygonPoints.length >= 3) {
        finishBtn.disabled = false;
        coordinatesDisplay.textContent += ' | Click near first point to close';
    }
});

gameImage.addEventListener('mousemove', function(event) {
    if (isOverlayMode) return;
    
    const coords = getImageCoordinates(event);
    
    if (isDrawingPolygon && polygonPoints.length > 0) {
        const tempPoints = [...polygonPoints, coords];
        const pointsString = tempPoints.map(point => `${point.x},${point.y}`).join(' ');
        currentPolygon.setAttribute('points', pointsString);
        
        coordinatesDisplay.textContent = `Hover: (${coords.x}, ${coords.y}) | Click to add point ${polygonPoints.length + 1}`;
        
        if (polygonPoints.length >= 3) {
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2));
            
            if (distance <= 10) {
                coordinatesDisplay.textContent += ' | Click to close polygon';
            }
        }
    } else {
        coordinatesDisplay.textContent = `Hover: (${coords.x}, ${coords.y}) | Click to start polygon`;
    }
});

gameImage.addEventListener('mouseleave', function() {
    if (isDrawingPolygon && polygonPoints.length > 0) {
        updatePolygonDisplay();
    }
});

async function storePolygon() {
    const polygonData = {
        id: polygonCounter,
        points: [...polygonPoints],
        label: prompt('Enter a label for this object (optional):') || `Object ${polygonCounter}`
    };
    
    try {
        const response = await fetch('/api/coordinates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(polygonData)
        });
        
        if (response.ok) {
            storedPolygons.push(polygonData);
            displayStoredPolygons();
            updateStoredPolygonsDisplay();
            polygonCounter++;
        }
    } catch (error) {
        console.error('Error saving polygon:', error);
    }
    
    polygonPoints = [];
    updatePolygonDisplay();
}

function displayStoredPolygons() {
    const storage = document.getElementById('polygonStorage');
    storage.innerHTML = '';
    
    storedPolygons.forEach(polygon => {
        const polygonDiv = document.createElement('div');
        polygonDiv.style.marginBottom = '10px';
        polygonDiv.style.padding = '10px';
        polygonDiv.style.backgroundColor = '#f8f9fa';
        polygonDiv.style.border = '1px solid #dee2e6';
        polygonDiv.style.borderRadius = '4px';
        polygonDiv.dataset.polygonId = polygon.id;
        
        const pointsText = polygon.points.map(p => `(${p.x},${p.y})`).join(', ');
        polygonDiv.innerHTML = `
            <strong>${polygon.label || `Polygon ${polygon.id}`}:</strong><br>
            <small>${pointsText}</small>
            <button class="delete-polygon-btn" onclick="deletePolygon(${polygon.id})" style="margin-left: 10px; padding: 2px 6px; font-size: 10px; background: #dc3545; color: white; border: none; border-radius: 3px;">Delete</button>
        `;
        
        storage.appendChild(polygonDiv);
    });
}

function updateStoredPolygonsDisplay() {
    storedPolygonsGroup.innerHTML = '';
    
    if (isOverlayMode) {
        storedPolygons.forEach((polygon, index) => {
            const polygonElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const pointsString = polygon.points.map(point => `${point.x},${point.y}`).join(' ');
            polygonElement.setAttribute('points', pointsString);
            polygonElement.setAttribute('fill', `rgba(0, 255, 0, 0.3)`);
            polygonElement.setAttribute('stroke', '#00ff00');
            polygonElement.setAttribute('stroke-width', '2');
            polygonElement.setAttribute('data-polygon-id', polygon.id);
            storedPolygonsGroup.appendChild(polygonElement);
        });
    }
}

async function deletePolygon(polygonId) {
    if (!confirm('Are you sure you want to delete this polygon?')) return;
    
    try {
        const response = await fetch(`/api/coordinates?id=${polygonId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            storedPolygons = storedPolygons.filter(p => p.id !== polygonId);
            displayStoredPolygons();
            updateStoredPolygonsDisplay();
        }
    } catch (error) {
        console.error('Error deleting polygon:', error);
    }
}

function toggleMode() {
    isOverlayMode = modeToggle.checked;
    
    if (isOverlayMode) {
        gameImage.style.cursor = 'default';
        currentPolygon.style.display = 'none';
        coordinatesDisplay.textContent = 'Overlay Mode: Viewing stored coordinates';
        clearBtn.disabled = true;
        finishBtn.disabled = true;
    } else {
        gameImage.style.cursor = 'crosshair';
        currentPolygon.style.display = 'block';
        coordinatesDisplay.textContent = 'Edit Mode: Click to start drawing';
        clearBtn.disabled = false;
        if (polygonPoints.length >= 3) {
            finishBtn.disabled = false;
        }
    }
    
    updateStoredPolygonsDisplay();
    
    // Refresh coordinate system when toggling modes
    updateSvgSize();
}

clearBtn.addEventListener('click', function() {
    polygonPoints = [];
    isDrawingPolygon = false;
    finishBtn.disabled = true;
    updatePolygonDisplay();
    coordinatesDisplay.textContent = 'Polygon cleared. Click to start drawing a new one';
});

finishBtn.addEventListener('click', function() {
    if (polygonPoints.length >= 3) {
        isDrawingPolygon = false;
        finishBtn.disabled = true;
        coordinatesDisplay.textContent = `Polygon completed with ${polygonPoints.length} points`;
        storePolygon();
    }
});

modeToggle.addEventListener('change', toggleMode);

clearAllBtn.addEventListener('click', async function() {
    if (!confirm('Are you sure you want to delete ALL stored polygons?')) return;
    
    try {
        const response = await fetch('/api/coordinates', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            storedPolygons = [];
            displayStoredPolygons();
            updateStoredPolygonsDisplay();
        }
    } catch (error) {
        console.error('Error clearing all polygons:', error);
    }
});

async function savePolygonSet() {
    const setName = setNameInput.value.trim();
    const setDescription = setDescriptionInput.value.trim();
    
    if (!setName) {
        alert('Please enter a set name');
        return;
    }
    
    if (storedPolygons.length === 0) {
        alert('No polygons to save. Please create some polygons first.');
        return;
    }
    
    try {
        const response = await fetch('/api/polygon-sets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: setName,
                description: setDescription,
                created_at: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            alert(`Polygon set "${setName}" saved successfully!`);
            setNameInput.value = '';
            setDescriptionInput.value = '';
            await loadPolygonSets();
        } else {
            const error = await response.json();
            alert(`Error saving set: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error saving polygon set:', error);
        alert('Error saving polygon set');
    }
}

async function loadPolygonSets() {
    try {
        const response = await fetch('/api/polygon-sets');
        if (response.ok) {
            polygonSets = await response.json();
            displayPolygonSets();
        }
    } catch (error) {
        console.error('Error loading polygon sets:', error);
    }
}

function displayPolygonSets() {
    setsContainer.innerHTML = '';
    
    if (Object.keys(polygonSets).length === 0) {
        setsContainer.innerHTML = '<p style="color: #666; font-style: italic;">No saved polygon sets</p>';
        return;
    }
    
    Object.values(polygonSets).forEach(set => {
        const setDiv = document.createElement('div');
        setDiv.style.marginBottom = '15px';
        setDiv.style.padding = '15px';
        setDiv.style.backgroundColor = '#ffffff';
        setDiv.style.border = '2px solid #e0e0e0';
        setDiv.style.borderRadius = '8px';
        setDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        
        const createdDate = set.created_at ? new Date(set.created_at).toLocaleDateString() : 'Unknown';
        
        setDiv.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <h5 style="margin: 0; color: #2c3e50;">${set.name}</h5>
                    <p style="margin: 5px 0; color: #7f8c8d; font-size: 12px;">Created: ${createdDate}</p>
                    ${set.description ? `<p style="margin: 5px 0; color: #34495e; font-size: 14px;">${set.description}</p>` : ''}
                    <p style="margin: 5px 0; color: #27ae60; font-size: 12px; font-weight: bold;">${set.polygons.length} polygon(s)</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="loadPolygonSet('${set.name}')" style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Load Set</button>
                <button onclick="deletePolygonSet('${set.name}')" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
            </div>
        `;
        
        setsContainer.appendChild(setDiv);
    });
}

async function loadPolygonSet(setName) {
    if (!confirm(`Load polygon set "${setName}"? This will replace your current polygons.`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/polygon-sets', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: setName })
        });
        
        if (response.ok) {
            const result = await response.json();
            storedPolygons = result.coordinates;
            displayStoredPolygons();
            updateStoredPolygonsDisplay();
            
            // Update polygon counter
            if (storedPolygons.length > 0) {
                polygonCounter = Math.max(...storedPolygons.map(p => p.id || 0)) + 1;
            }
            
            alert(`Polygon set "${setName}" loaded successfully!`);
        } else {
            const error = await response.json();
            alert(`Error loading set: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error loading polygon set:', error);
        alert('Error loading polygon set');
    }
}

async function deletePolygonSet(setName) {
    if (!confirm(`Are you sure you want to delete polygon set "${setName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/polygon-sets?name=${encodeURIComponent(setName)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert(`Polygon set "${setName}" deleted successfully!`);
            await loadPolygonSets();
        } else {
            const error = await response.json();
            alert(`Error deleting set: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting polygon set:', error);
        alert('Error deleting polygon set');
    }
}

// Event listeners for polygon set management
saveSetBtn.addEventListener('click', savePolygonSet);
refreshSetsBtn.addEventListener('click', loadPolygonSets);

// Make functions globally available for onclick handlers
window.loadPolygonSet = loadPolygonSet;
window.deletePolygonSet = deletePolygonSet;

// Navigation functions
function showCoordsSection() {
    coordsSection.style.display = 'block';
    studyContent.style.display = 'block';
    resultsSection.style.display = 'none';
    coordsNavBtn.classList.add('active');
    resultsNavBtn.classList.remove('active');
}

function showResultsSection() {
    coordsSection.style.display = 'none';
    studyContent.style.display = 'none';
    resultsSection.style.display = 'block';
    coordsNavBtn.classList.remove('active');
    resultsNavBtn.classList.add('active');
}

// Results management functions
async function loadResults() {
    try {
        loadResultsBtn.textContent = 'Loading...';
        loadResultsBtn.disabled = true;
        
        // Get filter values
        const imageMode = imageModeFilter.value;
        const username = usernameFilter.value.trim();
        
        // Build query params
        const params = new URLSearchParams();
        if (imageMode) params.append('image_mode', imageMode);
        if (username) params.append('username', username);
        
        const response = await fetch(`/api/admin/results?${params}`);
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.results;
            displayResults(currentResults);
            resultsCount.textContent = `${data.count} result(s) loaded`;
        } else {
            throw new Error(data.error || 'Failed to load results');
        }
    } catch (error) {
        console.error('Error loading results:', error);
        alert('Error loading results: ' + error.message);
    } finally {
        loadResultsBtn.textContent = 'Load All Results';
        loadResultsBtn.disabled = false;
    }
}

function displayResults(results) {
    if (results.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="9" class="no-results">No results found</td></tr>';
        return;
    }
    
    resultsTableBody.innerHTML = results.map(result => {
        const timestamp = result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A';
        const timeSeconds = (result.time_ms / 1000).toFixed(1);
        const questionnaire = result.questionnaire || {};
        
        // Create questionnaire summary
        const likertScores = [
            questionnaire.frustrated,
            questionnaire.challenged,
            questionnaire.happy,
            questionnaire.angry,
            questionnaire.upset,
            questionnaire.defeated,
            questionnaire.content,
            questionnaire.joyful
        ].filter(score => score !== null && score !== undefined);
        
        const avgLikert = likertScores.length > 0 ? 
            (likertScores.reduce((a, b) => a + b, 0) / likertScores.length).toFixed(1) : 'N/A';
        
        const visualSnowStatus = questionnaire.have_visual_snow || 'N/A';
        
        return `
            <tr onclick="showResultDetails(${result.id})" style="cursor: pointer;">
                <td>${result.id}</td>
                <td>${result.username}</td>
                <td>${result.score}</td>
                <td>${timeSeconds}</td>
                <td>${result.clicks}</td>
                <td>${result.found_objects}/${result.target_objects}</td>
                <td>${result.image_mode}</td>
                <td>${timestamp}</td>
                <td>
                    <div style="font-size: 11px;">
                        Avg: ${avgLikert}<br>
                        VS: ${visualSnowStatus}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showResultDetails(resultId) {
    const result = currentResults.find(r => r.id === resultId);
    if (!result) return;
    
    const questionnaire = result.questionnaire || {};
    const timestamp = result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A';
    
    const detailsHtml = `
        <strong>Study Session #${result.id}</strong><br><br>
        
        <strong>Performance:</strong><br>
        Username: ${result.username}<br>
        Score: ${result.score}<br>
        Time: ${(result.time_ms / 1000).toFixed(1)} seconds<br>
        Clicks: ${result.clicks}<br>
        Objects Found: ${result.found_objects}/${result.target_objects}<br>
        Image Mode: ${result.image_mode}<br>
        Completed: ${timestamp}<br><br>
        
        <strong>Questionnaire Responses (1-5 scale):</strong><br>
        Frustrated: ${questionnaire.frustrated || 'N/A'}<br>
        Challenged: ${questionnaire.challenged || 'N/A'}<br>
        Happy: ${questionnaire.happy || 'N/A'}<br>
        Angry: ${questionnaire.angry || 'N/A'}<br>
        Upset: ${questionnaire.upset || 'N/A'}<br>
        Defeated: ${questionnaire.defeated || 'N/A'}<br>
        Content: ${questionnaire.content || 'N/A'}<br>
        Joyful: ${questionnaire.joyful || 'N/A'}<br><br>
        
        <strong>Visual Snow Questions:</strong><br>
        Heard of visual snow: ${questionnaire.heard_visual_snow || 'N/A'}<br>
        Has visual snow: ${questionnaire.have_visual_snow || 'N/A'}
    `;
    
    alert(detailsHtml);
}

function exportResultsAsCSV() {
    if (currentResults.length === 0) {
        alert('No results to export. Please load results first.');
        return;
    }
    
    const csvHeaders = [
        'ID', 'Username', 'Score', 'Time_MS', 'Clicks', 'Found_Objects', 'Target_Objects', 
        'Image_Mode', 'Timestamp', 'Frustrated', 'Challenged', 'Happy', 'Angry', 'Upset', 
        'Defeated', 'Content', 'Joyful', 'Heard_Visual_Snow', 'Have_Visual_Snow'
    ];
    
    const csvRows = currentResults.map(result => {
        const q = result.questionnaire || {};
        return [
            result.id,
            result.username,
            result.score,
            result.time_ms,
            result.clicks,
            result.found_objects,
            result.target_objects,
            result.image_mode,
            result.timestamp || '',
            q.frustrated || '',
            q.challenged || '',
            q.happy || '',
            q.angry || '',
            q.upset || '',
            q.defeated || '',
            q.content || '',
            q.joyful || '',
            q.heard_visual_snow || '',
            q.have_visual_snow || ''
        ].map(field => `"${field}"`).join(',');
    });
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visual_snow_study_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Event listeners for results section
coordsNavBtn.addEventListener('click', showCoordsSection);
resultsNavBtn.addEventListener('click', showResultsSection);
loadResultsBtn.addEventListener('click', loadResults);
exportResultsBtn.addEventListener('click', exportResultsAsCSV);
imageModeFilter.addEventListener('change', loadResults);
usernameFilter.addEventListener('input', debounce(loadResults, 500));

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.showResultDetails = showResultDetails;

// Initialize display
displayStoredPolygons();
displayPolygonSets();