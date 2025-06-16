document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sidebarItems = document.querySelectorAll('.sidebar li');
    const sections = document.querySelectorAll('main section');
    const addModeSelect = document.getElementById('add-mode');
    const singleUserFields = document.getElementById('single-user-fields');
    const multiUserFields = document.getElementById('multi-user-fields');
    const addUserBtn = document.getElementById('add-user-btn');
    const showCategorySelect = document.getElementById('show-category');
    const userTableBody = document.querySelector('#user-table tbody');
    const usersLoading = document.getElementById('users-loading');
    const saveTokenBtn = document.getElementById('save-token');
    const githubTokenInput = document.getElementById('github-token');
    const statusMessage = document.getElementById('status-message');
    const editSearchBtn = document.getElementById('edit-search-btn');
    const editSearchInput = document.getElementById('edit-search');
    const editUserForm = document.getElementById('edit-user-form');

    // State
    let githubToken = localStorage.getItem('githubToken') || '';
    githubTokenInput.value = githubToken;

    // Event Listeners
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            showSection(sectionId);
            
            // Update active state
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Load data if needed
            if (sectionId === 'show-users') {
                loadUsers();
            }
        });
    });

    addModeSelect.addEventListener('change', toggleAddMode);
    addUserBtn.addEventListener('click', addUser);
    showCategorySelect.addEventListener('change', loadUsers);
    saveTokenBtn.addEventListener('click', saveToken);
    editSearchBtn.addEventListener('click', searchUserForEdit);

    // Initialize
    showSection('add-user');
    if (githubToken) {
        loadUsers();
    }

    // Functions
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
    }

    function toggleAddMode() {
        const mode = addModeSelect.value;
        singleUserFields.style.display = mode === 'single' ? 'block' : 'none';
        multiUserFields.style.display = mode === 'multi' ? 'block' : 'none';
    }

    function saveToken() {
        githubToken = githubTokenInput.value.trim();
        localStorage.setItem('githubToken', githubToken);
        showStatus('GitHub token saved successfully!', 'success');
    }

    async function loadUsers() {
        if (!githubToken) {
            showStatus('Please enter and save your GitHub token first', 'error');
            return;
        }

        usersLoading.style.display = 'flex';
        userTableBody.innerHTML = '';

        try {
            const category = showCategorySelect.value;
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getUsers',
                    token: githubToken,
                    category: category === 'ALL' ? null : category
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            userTableBody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.category}</td>
                    <td>${user.creationDate || 'N/A'}</td>
                    <td>${user.hwid || 'Not set'}</td>
                    <td>${user.expiryDate || 'No expiry'}</td>
                    <td>${user.lastUsed || 'Never'}</td>
                    <td>
                        <button class="btn-secondary" onclick="editUser('${user.username}', '${user.category}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary" onclick="deleteUser('${user.username}', '${user.category}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            showStatus(`Error loading users: ${error.message}`, 'error');
            console.error('Error loading users:', error);
        } finally {
            usersLoading.style.display = 'none';
        }
    }

    async function addUser() {
        if (!githubToken) {
            showStatus('Please enter and save your GitHub token first', 'error');
            return;
        }

        const mode = addModeSelect.value;
        const category = document.getElementById('user-category').value;
        const expiryDate = document.getElementById('expiry-date').value || 'No Expiry';

        try {
            let users = [];
            
            if (mode === 'single') {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                
                if (!username || !password) {
                    throw new Error('Username and password are required');
                }
                
                users.push({ username, password });
            } else {
                const usernamesText = document.getElementById('multi-usernames').value.trim();
                const password = document.getElementById('multi-password').value.trim();
                
                if (!usernamesText || !password) {
                    throw new Error('Usernames and password are required');
                }
                
                users = usernamesText.split('\n')
                    .map(u => u.trim())
                    .filter(u => u)
                    .map(username => ({ username, password }));
            }

            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addUsers',
                    token: githubToken,
                    category,
                    expiryDate,
                    users
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            showStatus(`${users.length} user(s) added successfully to ${category} category!`, 'success');
            
            // Clear form
            if (mode === 'single') {
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
            } else {
                document.getElementById('multi-usernames').value = '';
                document.getElementById('multi-password').value = '';
            }
            document.getElementById('expiry-date').value = '';
            
            // Reload users if on that section
            if (document.querySelector('#show-users').classList.contains('active')) {
                loadUsers();
            }
        } catch (error) {
            showStatus(`Error adding user(s): ${error.message}`, 'error');
            console.error('Error adding user(s):', error);
        }
    }

    async function searchUserForEdit() {
        const username = editSearchInput.value.trim();
        if (!username) {
            showStatus('Please enter a username to search', 'error');
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'searchUser',
                    token: githubToken,
                    username
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.user) {
                throw new Error('User not found');
            }

            // Populate edit form
            editUserForm.innerHTML = `
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" id="edit-username" value="${data.user.username}" readonly>
                </div>
                <div class="form-group">
                    <label>Category:</label>
                    <input type="text" id="edit-category" value="${data.user.category}" readonly>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="text" id="edit-password" value="${data.user.password}">
                </div>
                <div class="form-group">
                    <label>HWID:</label>
                    <input type="text" id="edit-hwid" value="${data.user.hwid || ''}">
                </div>
                <div class="form-group">
                    <label>Expiry Date:</label>
                    <input type="text" id="edit-expiry" value="${data.user.expiryDate || ''}">
                </div>
                <div class="form-group">
                    <label>Creation Date:</label>
                    <input type="text" id="edit-creation" value="${data.user.creationDate || ''}">
                </div>
                <button id="save-edit-btn" class="btn-primary"><i class="fas fa-save"></i> Save Changes</button>
            `;

            editUserForm.style.display = 'block';
            
            // Add event listener to save button
            document.getElementById('save-edit-btn').addEventListener('click', saveEditedUser);
        } catch (error) {
            showStatus(`Error searching user: ${error.message}`, 'error');
            console.error('Error searching user:', error);
            editUserForm.style.display = 'none';
        }
    }

    async function saveEditedUser() {
        const username = document.getElementById('edit-username').value;
        const category = document.getElementById('edit-category').value;
        const password = document.getElementById('edit-password').value;
        const hwid = document.getElementById('edit-hwid').value;
        const expiryDate = document.getElementById('edit-expiry').value;
        const creationDate = document.getElementById('edit-creation').value;

        try {
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'editUser',
                    token: githubToken,
                    username,
                    category,
                    updates: {
                        password,
                        hwid,
                        expiryDate,
                        creationDate
                    }
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            showStatus('User updated successfully!', 'success');
            editUserForm.style.display = 'none';
            editSearchInput.value = '';
            
            // Reload users if on that section
            if (document.querySelector('#show-users').classList.contains('active')) {
                loadUsers();
            }
        } catch (error) {
            showStatus(`Error updating user: ${error.message}`, 'error');
            console.error('Error updating user:', error);
        }
    }

    async function deleteUser(username, category) {
        if (!confirm(`Are you sure you want to delete user ${username}?`)) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteUser',
                    token: githubToken,
                    username,
                    category
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            showStatus(`User ${username} deleted successfully!`, 'success');
            loadUsers();
        } catch (error) {
            showStatus(`Error deleting user: ${error.message}`, 'error');
            console.error('Error deleting user:', error);
        }
    }

    async function resetHwid(username, category) {
        try {
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'resetHwid',
                    token: githubToken,
                    username,
                    category
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            showStatus(`HWID reset for ${username}`, 'success');
            loadUsers();
        } catch (error) {
            showStatus(`Error resetting HWID: ${error.message}`, 'error');
            console.error('Error resetting HWID:', error);
        }
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    // Make functions available globally for table buttons
    window.editUser = function(username, category) {
        showSection('edit-user');
        editSearchInput.value = username;
        searchUserForEdit();
    };

    window.deleteUser = deleteUser;
    window.resetHwid = resetHwid;
});