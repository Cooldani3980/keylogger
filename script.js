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

let currentComputer = null;
let computers = [
  {
    id: '1',
    name: 'Computer A',
    last_connected: '2025-08-27T14:30:00Z',
    keystrokes: [
      { key: 'H', timestamp: '2025-08-27T14:31:05Z' },
      { key: 'e', timestamp: '2025-08-27T14:31:06Z' },
      { key: 'l', timestamp: '2025-08-27T14:31:07Z' },
      { key: 'l', timestamp: '2025-08-27T14:31:08Z' },
      { key: 'o', timestamp: '2025-08-27T14:31:09Z' }
    ]
  },
  {
    id: '2',
    name: 'Computer B',
    last_connected: '2025-08-27T14:28:00Z',
    keystrokes: []
  },
  {
    id: '3',
    name: 'Computer C',
    last_connected: '2025-08-27T14:25:00Z',
    keystrokes: []
  }
];

const users = [
  { username: 'admin', password: 'password' }
];

let keywords = [];

function normalizeKeystrokeData(rawData) {
  const normalizedData = {
    keystrokes: [],
    last_connected: null
  };

  if (rawData.keystrokes && Array.isArray(rawData.keystrokes)) {
    normalizedData.keystrokes = rawData.keystrokes;
    normalizedData.last_connected = rawData.last_connected;
  }

  return normalizedData;
}

function showViewer(computer) {
  const normalizedData = normalizeKeystrokeData(computer);

  dashboardContainer.style.display = 'none';
  keystrokeViewer.style.display = 'block';
  computerNameDisplay.textContent = computer.name;

  currentComputer = normalizedData;

  const lastConnectedDisplay = document.getElementById('last-connected');
  if (normalizedData.last_connected) {
    const date = new Date(normalizedData.last_connected);
    lastConnectedDisplay.textContent = date.toLocaleString();
  } else {
    lastConnectedDisplay.textContent = 'N/A';
  }

  renderKeystrokes(normalizedData.keystrokes);
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
  input.classList.add('rename-input');

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
  keystrokesToRender.forEach(keystroke => {
    const keystrokeItem = document.createElement('div');
    keystrokeItem.classList.add('keystroke-item');

    if (keywords.includes(keystroke.key.toLowerCase())) {
      keystrokeItem.classList.add('highlight');
    }

    keystrokeItem.addEventListener('click', () => {
      keystrokeItem.classList.toggle('highlight');
    });
    
    const keyElement = document.createElement('span');
    keyElement.classList.add('keystroke-key');
    keyElement.textContent = keystroke.key;
    const timestampElement = document.createElement('span');
    timestampElement.classList.add('keystroke-timestamp');
    const keystrokeDate = new Date(keystroke.timestamp);
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
      renderKeywords();
      if (currentComputer) {
        renderKeystrokes(currentComputer.keystrokes);
      }
    });
    keywordListContainer.appendChild(tag);
  });
}

function getStatus() {
    return Math.random() > 0.5 ? 'online' : 'offline';
}

backButton.addEventListener('click', showDashboard);
logoutButton.addEventListener('click', logout);

function renderComputers(computersToRender) {
  computerList.innerHTML = '';
  computersToRender.forEach(computer => {
    const computerCard = document.createElement('div');
    computerCard.classList.add('computer-card');
    computerCard.dataset.id = computer.id;

    const statusIndicator = document.createElement('div');
    statusIndicator.classList.add('status-indicator', `status-${getStatus()}`);

    const computerIcon = document.createElement('i');
    computerIcon.classList.add('fas', 'fa-laptop');

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
    renderKeystrokes(filteredKeystrokes);
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

  const isNineDigits = /^\d{9}$/.test(username);
  if (!isNineDigits) {
    alert('User ID must be exactly 9 numbers.');
    return;
  }

  users.push({ username: username, password: password });
  alert('Account created successfully! Please log in.');

  loginContainer.style.display = 'flex';
  signupContainer.style.display = 'none';
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
      id: (computers.length + 1).toString(),
      name: newComputerName,
      last_connected: new Date().toISOString(),
      keystrokes: []
    };
    computers.push(newComputer);
    renderComputers(computers);
  }
}

function deleteComputer(computerId) {
  const newComputers = computers.filter(computer => computer.id !== computerId);
  computers = newComputers;
  renderComputers(computers);
}

addComputerButton.addEventListener('click', addComputer);

renderComputers(computers);
renderKeywords();