const gameImage = document.getElementById('gameImage');
const normalModeRadio = document.getElementById('normalMode');
const tintedModeRadio = document.getElementById('tintedMode');
const imageControls = document.getElementById('imageControls');
const brightnessSlider = document.getElementById('brightnessSlider');
const noiseSlider = document.getElementById('noiseSlider');
const brightnessValue = document.getElementById('brightnessValue');
const noiseValue = document.getElementById('noiseValue');
const coordinatesDisplay = document.getElementById('coordinates');
const polygonSvg = document.getElementById('polygonSvg');
const storedPolygonsGroup = document.getElementById('storedPolygons');
const foundObjectsDiv = document.getElementById('foundObjects');
const targetObjectsDiv = document.getElementById('targetObjects');
const timerDiv = document.getElementById('timer');
const scoreDiv = document.getElementById('score');
const objectsRemainingDiv = document.getElementById('objectsRemaining');
const taskCompleteModal = document.getElementById('gameCompleteModal');
const usernameInput = document.getElementById('usernameInput');
const submitScoreBtn = document.getElementById('submitScore');
const imageRevealOverlay = document.getElementById('imageRevealOverlay');
const revealBtn = document.getElementById('revealBtn');

let storedPolygons = window.storedCoordinates || [];
let targetObjects = [];
let foundObjects = [];
let clickCounter = 1;
let score = 0;
let startTime = null;
let timerInterval = null;
let taskComplete = false;
let taskStarted = false;

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
    
    console.log(`SVG updated: ${width}x${height} (fixed)`);
}

function checkIfPointInPolygon(point, polygon) {
    let inside = false;
    const points = polygon.points;
    
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        if (((points[i].y > point.y) !== (points[j].y > point.y)) &&
            (point.x < (points[j].x - points[i].x) * (point.y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
            inside = !inside;
        }
    }
    
    return inside;
}

function selectRandomObjects(polygons, count = 5) {
    if (polygons.length <= count) {
        return [...polygons];
    }
    
    const shuffled = [...polygons].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function displayTargetObjects() {
    if (targetObjects.length === 0) {
        targetObjectsDiv.innerHTML = '<p>No target objects selected.</p>';
        return;
    }
    
    targetObjectsDiv.innerHTML = '';
    targetObjects.forEach((obj, index) => {
        const objDiv = document.createElement('div');
        objDiv.className = 'target-item';
        objDiv.id = `target-${obj.id}`;
        
        const isFound = foundObjects.some(found => found.polygonId === obj.id);
        if (isFound) {
            objDiv.classList.add('found');
        }
        
        objDiv.textContent = obj.label || `Object ${obj.id}`;
        targetObjectsDiv.appendChild(objDiv);
    });
}

function displayFoundObjects() {
    // This function is now simplified since found objects are shown in the target list
    // Just update the target objects display to show found status
    displayTargetObjects();
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    if (!startTime || taskComplete) return;
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    timerDiv.textContent = `Time: ${timeString}`;
}

function updateScore(points) {
    score += points;
    scoreDiv.textContent = `Score: ${score}`;
}

function updateObjectsRemaining() {
    const remaining = targetObjects.length - foundObjects.length;
    objectsRemainingDiv.textContent = `Objects to find: ${remaining}`;
}

function checkTaskComplete() {
    if (foundObjects.length >= targetObjects.length) {
        taskComplete = true;
        clearInterval(timerInterval);
        showTaskComplete();
    }
}

function showTaskComplete() {
    const finalTime = Date.now() - startTime;
    const seconds = Math.floor(finalTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    document.getElementById('finalTime').textContent = `Final Time: ${timeString}`;
    document.getElementById('finalScore').textContent = `Final Score: ${score}`;
    document.getElementById('clicksSummary').textContent = `Total Clicks: ${clickCounter - 1}`;
    
    taskCompleteModal.style.display = 'flex';
    
    // Focus on username input
    setTimeout(() => {
        usernameInput.focus();
    }, 300);
}

// Handle score submission
submitScoreBtn.addEventListener('click', async function() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter your ID.');
        usernameInput.focus();
        return;
    }
    
    // Collect questionnaire data
    const questionnaireData = collectQuestionnaireData();
    if (!questionnaireData) {
        alert('Please answer all questionnaire questions before submitting.');
        return;
    }
    
    // Disable button during submission
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';
    
    try {
        const finalTime = Date.now() - startTime;
        const studyData = {
            username: username,
            score: score,
            time: finalTime,
            clicks: clickCounter - 1,
            foundObjects: foundObjects.length,
            targetObjects: targetObjects.length,
            imageMode: tintedModeRadio.checked ? 'visual_snow' : 'normal',
            timestamp: new Date().toISOString(),
            questionnaire: questionnaireData
        };
        
        const response = await fetch('/api/submit-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studyData)
        });
        
        if (response.ok) {
            submitScoreBtn.textContent = 'Submitted!';
            submitScoreBtn.style.background = '#4caf50';
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            throw new Error('Failed to submit score');
        }
    } catch (error) {
        alert('Failed to submit data. Please try again.');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Submit Score';
    }
});

// Allow Enter key to submit
usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !submitScoreBtn.disabled) {
        submitScoreBtn.click();
    }
});

gameImage.addEventListener('load', updateSvgSize);

// Initial setup
updateSvgSize();

gameImage.addEventListener('click', function(event) {
    if (taskComplete || !taskStarted) return;
    
    event.preventDefault();
    const coords = getImageCoordinates(event);
    
    // Check if click is inside any target polygon
    let foundObject = null;
    for (let polygon of targetObjects) {
        if (checkIfPointInPolygon(coords, polygon)) {
            // Check if this object was already found
            const alreadyFound = foundObjects.some(obj => obj.polygonId === polygon.id);
            if (!alreadyFound) {
                foundObject = polygon;
                break;
            }
        }
    }
    
    if (foundObject) {
        // Found a target object!
        const objectData = {
            clickNumber: clickCounter++,
            coordinates: coords,
            objectName: foundObject.label || `Object ${foundObject.id}`,
            polygonId: foundObject.id,
            timestamp: new Date().toISOString()
        };
        
        foundObjects.push(objectData);
        updateScore(1); // +1 point for correct identification
        coordinatesDisplay.textContent = `Located: ${objectData.objectName}! +1 point`;
        
        // Visual feedback - show a green circle at click point
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', coords.x);
        circle.setAttribute('cy', coords.y);
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#4caf50');
        circle.setAttribute('stroke', '#2e7d32');
        circle.setAttribute('stroke-width', '2');
        storedPolygonsGroup.appendChild(circle);
        
        displayFoundObjects();
        displayTargetObjects();
        updateObjectsRemaining();
        checkTaskComplete();
    } else {
        // Didn't find a target object
        clickCounter++;
        updateScore(-1); // -1 point for incorrect identification
        coordinatesDisplay.textContent = `No target object at (${coords.x}, ${coords.y}). -1 point`;
        
        // Visual feedback - show a red X
        const cross1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross1.setAttribute('x1', coords.x - 5);
        cross1.setAttribute('y1', coords.y - 5);
        cross1.setAttribute('x2', coords.x + 5);
        cross1.setAttribute('y2', coords.y + 5);
        cross1.setAttribute('stroke', '#f44336');
        cross1.setAttribute('stroke-width', '2');
        storedPolygonsGroup.appendChild(cross1);
        
        const cross2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross2.setAttribute('x1', coords.x + 5);
        cross2.setAttribute('y1', coords.y - 5);
        cross2.setAttribute('x2', coords.x - 5);
        cross2.setAttribute('y2', coords.y + 5);
        cross2.setAttribute('stroke', '#f44336');
        cross2.setAttribute('stroke-width', '2');
        storedPolygonsGroup.appendChild(cross2);
        
        // Remove the X after 1 second
        setTimeout(() => {
            if (cross1.parentNode) cross1.remove();
            if (cross2.parentNode) cross2.remove();
        }, 1000);
    }
});

gameImage.addEventListener('mousemove', function(event) {
    if (taskComplete || !taskStarted) return;
    
    const coords = getImageCoordinates(event);
    coordinatesDisplay.textContent = `Position: (${coords.x}, ${coords.y}) | Click to identify objects`;
});

// Handle reveal button click
revealBtn.addEventListener('click', function() {
    // Hide the overlay
    imageRevealOverlay.style.display = 'none';
    
    // Start the task
    taskStarted = true;
    startTimer();
    
    // Set the image mode
    const useVisualSnow = Math.random() < 0.5;
    
    if (useVisualSnow) {
        tintedModeRadio.checked = true;
        updateImageMode();
    } else {
        normalModeRadio.checked = true;
        updateImageMode();
    }
    
    // Ensure coordinates are properly aligned after reveal
    updateSvgSize();
});

// Image processing functions
function updateProcessedImage() {
    const brightness = 0.6;  // Fixed brightness value
    const noise = 1.5;       // Fixed noise value
    
    const imageUrl = `/api/generate-image?brightness=${brightness}&noise=${noise}&t=${Date.now()}`;
    gameImage.src = imageUrl;
    
    // Simple coordinate refresh when image loads
    gameImage.onload = updateSvgSize;
}

// Image mode toggle functionality
function updateImageMode() {
    if (tintedModeRadio.checked) {
        updateProcessedImage();
    } else {
        gameImage.src = gameImage.dataset.normalSrc;
        gameImage.onload = updateSvgSize;
    }
}

// Slider event listeners
brightnessSlider.addEventListener('input', function() {
    brightnessValue.textContent = this.value;
    if (tintedModeRadio.checked) {
        updateProcessedImage();
    }
});

noiseSlider.addEventListener('input', function() {
    noiseValue.textContent = this.value;
    if (tintedModeRadio.checked) {
        updateProcessedImage();
    }
});

normalModeRadio.addEventListener('change', updateImageMode);
tintedModeRadio.addEventListener('change', updateImageMode);

// Initialize study task
function initializeTask() {
    // Select 5 random objects as targets
    targetObjects = selectRandomObjects(storedPolygons, 5);
    
    // Display target objects
    displayTargetObjects();
    displayFoundObjects();
    
    // Don't start timer yet - wait for reveal button
    
    // Update instructions
    const instructionsElement = document.querySelector('.study-instructions p');
    if (targetObjects.length > 0) {
        instructionsElement.textContent = `Locate the ${targetObjects.length} target objects listed above by clicking on them in the image. You receive +1 point for each correct identification and -1 point for each incorrect identification.`;
    } else {
        instructionsElement.textContent = 'No objects have been configured. Please contact the study administrator.';
    }
}

// Function to collect questionnaire data
function collectQuestionnaireData() {
    const likertQuestions = ['frustrated', 'challenged', 'happy', 'angry', 'upset', 'defeated', 'content', 'joyful'];
    const yesNoQuestions = ['heardVisualSnow', 'haveVisualSnow'];
    
    const data = {};
    
    // Collect Likert scale responses
    for (const question of likertQuestions) {
        const selected = document.querySelector(`input[name="${question}"]:checked`);
        if (!selected) {
            return null; // Missing response
        }
        data[question] = parseInt(selected.value);
    }
    
    // Collect yes/no responses
    for (const question of yesNoQuestions) {
        const selected = document.querySelector(`input[name="${question}"]:checked`);
        if (!selected) {
            return null; // Missing response
        }
        data[question] = selected.value;
    }
    
    return data;
}

// Initialize display
initializeTask();