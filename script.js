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

let computers = JSON.parse(localStorage.getItem('computers')) || [
    {
        id: '1',
        name: 'Computer A',
        last_connected: '2025-08-27T14:30:00Z',
        keystrokes: [
            { key: 'H', timestamp: '2025-08-27T14:31:05Z' },
            { key: 'e', timestamp: '2025-08-27T14:31:06Z' },
            { key: 'l', timestamp: '2025-08-27T14:31:07Z' },
            { key: 'l', timestamp: '2025-08-27T14:31:08Z' },
            { key: 'o', timestamp: '2025-08-27T14:31:09Z' },
            { key: ' ', timestamp: '2025-08-27T14:31:09Z' },
            { key: 'W', timestamp: '2025-08-27T14:31:10Z' },
            { key: 'o', timestamp: '2025-08-27T14:31:11Z' },
            { key: 'r', timestamp: '2025-08-27T14:31:12Z' },
            { key: 'd', timestamp: '2025-08-27T14:31:13Z' }
        ]
    },
    {
        id: '2',
        name: 'Computer B',
        last_connected: '2025-08-27T14:28:00Z',
        keystrokes: [
            { key: 'D', timestamp: '2025-08-27T14:31:05Z' },
            { key: 'o', timestamp: '2025-08-27T14:31:06Z' },
            { key: 'g', timestamp: '2025-08-27T14:31:07Z' },
        ]
    },
    {
        id: '3',
        name: 'Computer C',
        last_connected: '2025-08-27T14:25:00Z',
        keystrokes: []
    }
];

let users = JSON.parse(localStorage.getItem('users')) || [
    { username: 'admin', password: 'password' }
];

let keywords = JSON.parse(localStorage.getItem('keywords')) || ['hello', 'password'];
let currentComputer = null;

function saveData() {
    localStorage.setItem('computers', JSON.stringify(computers));
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('keywords', JSON.stringify(keywords));
}

function processKeystrokes(keystrokes) {
    const processedLog = [];
    let currentWord = '';

    keystrokes.forEach((keystroke) => {
        const key = keystroke.key;
        const isWordCharacter = /^[a-zA-Z]$/.test(key);

        if (isWordCharacter) {
            currentWord += key;
            processedLog.push(keystroke);
        } else {
            if (currentWord.length > 0) {
                const wordKeystroke = { key: currentWord, timestamp: keystroke.timestamp, isWord: true };
                processedLog.push(wordKeystroke);
            }
            processedLog.push(keystroke);
            currentWord = '';
        }
    });

    if (currentWord.length > 0) {
        processedLog.push({ key: currentWord, timestamp: keystrokes[keystrokes.length - 1].timestamp, isWord: true });
    }

    return processedLog;
}

function showViewer(computer) {
    dashboardContainer.style.display = 'none';
    keystrokeViewer.style.display = 'block';
    computerNameDisplay.textContent = computer.name;

    currentComputer = computer;

    const lastConnectedDisplay = document.getElementById('last-connected');
    if (computer.last_connected) {
        const date = new Date(computer.last_connected);
        lastConnectedDisplay.textContent = date.toLocaleString();
    } else {
        lastConnectedDisplay.textContent = 'N/A';
    }
    
    renderKeystrokes(processKeystrokes(computer.keystrokes));
}

function showDashboard() {
    dashboardContainer.style.display = 'block';
    keystrokeViewer.style.display = 'none';
    keystrokeSearchInput.value = '';
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

    saveButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const newName = input.value;
        const computerId = card.dataset.id;
        const computer = computers.find(c => c.id === computerId);

        if (computer) {
            computer.name = newName;
            saveData();
        }

        oldTextSpan.textContent = newName;
        oldTextSpan.style.display = 'block';
        oldIconSpan.style.display = 'block';
        card.removeChild(input);
        card.removeChild(saveButton);
        card.removeChild(cancelButton);
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

function renderKeystrokes(keystrokesToRender) {
    keystrokeLog.innerHTML = '';
    keystrokesToRender.forEach(item => {
        const keystrokeItem = document.createElement('div');
        keystrokeItem.classList.add('keystroke-item');
        
        if (item.key.length > 1 || item.key === ' ') {
            keystrokeItem.classList.add('keystroke-word');
        }

        if (keywords.includes(item.key.toLowerCase())) {
            keystrokeItem.classList.add('highlight');
        }
        
        const keyElement = document.createElement('span');
        keyElement.classList.add('keystroke-key');
        keyElement.textContent = item.key;
        
        const timestampElement = document.createElement('span');
        timestampElement.classList.add('keystroke-timestamp');
        const keystrokeDate = new Date(item.timestamp);
        timestampElement.textContent = keystrokeDate.toLocaleTimeString();

        keystrokeItem.appendChild(keyElement);
        keystrokeItem.appendChild(timestampElement);
        keystrokeLog.appendChild(keystrokeItem);
    });
}

function renderKeywords() {
    keywordListContainer.innerHTML = '';
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.innerHTML = `<span>${keyword}</span><span class="tag-remove">✖</span>`;
        tag.querySelector('.tag-remove').addEventListener('click', () => {
            keywords = keywords.filter(k => k !== keyword);
            saveData();
            renderKeywords();
            if (currentComputer) {
                renderKeystrokes(processKeystrokes(currentComputer.keystrokes));
            }
        });
        keywordListContainer.appendChild(tag);
    });
}

function handleAddKeyword() {
    const newKeyword = keywordInput.value.trim().toLowerCase();
    if (newKeyword && !keywords.includes(newKeyword)) {
        keywords.push(newKeyword);
        saveData();
        renderKeywords();
        if (currentComputer) {
            renderKeystrokes(processKeystrokes(currentComputer.keystrokes));
        }
        keywordInput.value = '';
    }
}

function getStatus() {
    return Math.random() > 0.5 ? 'online' : 'offline';
}

backButton.addEventListener('click', showDashboard);
logoutButton.addEventListener('click', logout);
addKeywordButton.addEventListener('click', handleAddKeyword);

function renderComputers(computersToRender) {
    computerList.innerHTML = '';
    computersToRender.forEach(computer => {
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
            const confirmed = confirm('Are you sure you want to delete this computer?');
            if (confirmed) {
                deleteComputer(computer.id);
            }
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
    const totalKeystrokes = computers.reduce((acc, computer) => acc + computer.keystrokes.length, 0);
    totalKeystrokesDisplay.textContent = totalKeystrokes;
}

searchInput.addEventListener('input', (event) => {
    const query = event.target.value;
    const filteredComputers = computers.filter(computer =>
        computer.name.toLowerCase().includes(query.toLowerCase())
    );
    renderComputers(filteredComputers);
});

keystrokeSearchInput.addEventListener('input', (event) => {
    if (currentComputer) {
        const query = event.target.value.toLowerCase();
        const filteredKeystrokes = currentComputer.keystrokes.filter(keystroke =>
            keystroke.key.toLowerCase().includes(query)
        );
        renderKeystrokes(processKeystrokes(filteredKeystrokes));
    }
});

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        loginContainer.style.display = 'none';
        showDashboard();
        renderComputers(computers);
    } else {
        alert('Invalid credentials. Please try again.');
    }
});

signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    const userExists = users.some(user => user.username === username);
    if (userExists) {
        alert('This username already exists. Please try another one.');
        return;
    }

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

    users.push({ username: username, password: password });
    saveData();
    alert('Account created successfully! Please log in.');

    loginContainer.style.display = 'flex';
    signupContainer.style.display = 'none';
});

const showSignupButton = document.getElementById('show-signup-button');
const showLoginButton = document.getElementById('show-login-button');

showSignupButton.addEventListener('click', (event) => {
    event.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'flex';
});

showLoginButton.addEventListener('click', (event) => {
    event.preventDefault();
    loginContainer.style.display = 'flex';
    signupContainer.style.display = 'none';
});

function logout() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
    searchInput.value = '';
    keystrokeSearchInput.value = '';
}

function addComputer() {
    const newComputerName = prompt('Enter the name of the new computer:');
    if (newComputerName) {
        const newComputer = {
            id: Date.now().toString(),
            name: newComputerName,
            last_connected: new Date().toISOString(),
            keystrokes: []
        };
        computers.push(newComputer);
        saveData();
        renderComputers(computers);
    }
}

function deleteComputer(computerId) {
    const newComputers = computers.filter(computer => computer.id !== computerId);
    computers = newComputers;
    saveData();
    renderComputers(computers);
}

addComputerButton.addEventListener('click', addComputer);

renderComputers(computers);
renderKeywords();

setInterval(() => {
    renderComputers(computers);
}, 5000);
