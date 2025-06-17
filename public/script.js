// script.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sidebarItems = document.querySelectorAll('.sidebar li');
    const sections = document.querySelectorAll('main section');
    const githubTokenInput = document.getElementById('github-token');
    const saveTokenBtn = document.getElementById('save-token');
    const statusMessage = document.getElementById('status-message');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Add User Elements
    const addModeSelect = document.getElementById('add-mode');
    const singleUserFields = document.getElementById('single-user-fields');
    const multiUserFields = document.getElementById('multi-user-fields');
    const addUserBtn = document.getElementById('add-user-btn');

    // Edit User Elements
    const editSearchInput = document.getElementById('edit-search');
    const editSearchBtn = document.getElementById('edit-search-btn');
    const editUserForm = document.getElementById('edit-user-form');

    // Delete User Elements
    const deleteUsernameInput = document.getElementById('delete-username');
    const deleteCategorySelect = document.getElementById('delete-category');
    const deleteUserBtn = document.getElementById('delete-user-btn');

    // Reset HWID Elements
    const resetHwidUsernameInput = document.getElementById('reset-hwid-username');
    const resetHwidCategorySelect = document.getElementById('reset-hwid-category');
    const resetHwidBtn = document.getElementById('reset-hwid-btn');

    // Show Users Elements
    const showCategorySelect = document.getElementById('show-category');
    const userTableBody = document.querySelector('#user-table tbody');

    // Search User Elements
    const searchUsernameInput = document.getElementById('search-username');
    const searchUserBtn = document.getElementById('search-user-btn');
    const searchResultsDiv = document.getElementById('search-results');

    // Delete Expired Elements
    const deleteExpiredBtn = document.getElementById('delete-expired-btn');
    const deleteExpiredResults = document.getElementById('delete-expired-results');

    // State
    let githubToken = localStorage.getItem('githubToken') || '';
    githubTokenInput.value = githubToken;

    // Initialize
    showSection('add-user');
    if (githubToken) loadUsers();

    // Event Listeners
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            showSection(sectionId);
            updateActiveNav(item);
        });
    });

    saveTokenBtn.addEventListener('click', saveToken);
    addModeSelect.addEventListener('change', toggleAddMode);
    addUserBtn.addEventListener('click', addUser);
    editSearchBtn.addEventListener('click', searchUserForEdit);
    deleteUserBtn.addEventListener('click', deleteUser);
    resetHwidBtn.addEventListener('click', resetHwid);
    showCategorySelect.addEventListener('change', loadUsers);
    searchUserBtn.addEventListener('click', searchUser);
    deleteExpiredBtn.addEventListener('click', deleteExpiredUsers);

    // Functions
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) section.classList.add('active');
        });
    }

    function updateActiveNav(activeItem) {
        sidebarItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        setTimeout(() => statusMessage.style.display = 'none', 5000);
    }

    function saveToken() {
        githubToken = githubTokenInput.value.trim();
        if (!githubToken) {
            showStatus('Please enter a GitHub token', 'error');
            return;
        }
        localStorage.setItem('githubToken', githubToken);
        showStatus('GitHub token saved successfully!', 'success');
        loadUsers();
    }

    async function apiRequest(action, data = {}) {
        if (!githubToken) {
            showStatus('Please save your GitHub token first', 'error');
            return null;
        }

        showLoading(true);
        try {
            const response = await fetch('/.netlify/functions/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, token: githubToken, ...data })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `API request failed: ${action}`);
            return result;
        } catch (error) {
            console.error(`${action} error:`, error);
            showStatus(error.message, 'error');
            return null;
        } finally {
            showLoading(false);
        }
    }

    function toggleAddMode() {
        const mode = addModeSelect.value;
        singleUserFields.style.display = mode === 'single' ? 'block' : 'none';
        multiUserFields.style.display = mode === 'multi' ? 'block' : 'none';
    }

    async function addUser() {
        const mode = addModeSelect.value;
        const category = document.getElementById('user-category').value;
        const expiryDate = document.getElementById('expiry-date').value || 'No Expiry';

        try {
            let users = [];
            if (mode === 'single') {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                if (!username || !password) throw new Error('Username and password are required');
                users.push({ username, password });
            } else {
                const usernamesText = document.getElementById('multi-usernames').value.trim();
                const password = document.getElementById('multi-password').value.trim();
                if (!usernamesText || !password) throw new Error('Usernames and password are required');
                users = usernamesText.split('\n').map(u => u.trim()).filter(u => u).map(username => ({ username, password }));
            }

            const result = await apiRequest('addUsers', { category, expiryDate, users });
            if (result) {
                showStatus(`${users.length} user(s) added to ${category}!`, 'success');
                if (mode === 'single') {
                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                } else {
                    document.getElementById('multi-usernames').value = '';
                    document.getElementById('multi-password').value = '';
                }
                document.getElementById('expiry-date').value = '';
                if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
            }
        } catch (error) {
            console.error('Add user error:', error);
        }
    }

    async function searchUserForEdit() {
        const username = editSearchInput.value.trim();
        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        const result = await apiRequest('searchUser', { username });
        if (result?.user) {
            editUserForm.innerHTML = `
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" id="edit-username" value="${result.user.username}" readonly>
                </div>
                <div class="form-group">
                    <label>Category:</label>
                    <input type="text" id="edit-category" value="${result.user.category}" readonly>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="text" id="edit-password" value="${result.user.password}">
                </div>
                <div class="form-group">
                    <label>HWID:</label>
                    <input type="text" id="edit-hwid" value="${result.user.hwid || ''}">
                </div>
                <div class="form-group">
                    <label>Expiry Date:</label>
                    <input type="text" id="edit-expiry" value="${result.user.expiryDate || ''}">
                </div>
                <button id="save-edit-btn" class="btn-primary"><i class="fas fa-save"></i> Save Changes</button>
            `;
            editUserForm.style.display = 'block';
            document.getElementById('save-edit-btn').addEventListener('click', saveEditedUser);
        }
    }

    async function saveEditedUser() {
        const username = document.getElementById('edit-username').value;
        const category = document.getElementById('edit-category').value;
        const password = document.getElementById('edit-password').value;
        const hwid = document.getElementById('edit-hwid').value;
        const expiryDate = document.getElementById('edit-expiry').value;

        const result = await apiRequest('editUser', {
            username,
            category,
            updates: { password, hwid, expiryDate }
        });

        if (result) {
            showStatus('User updated successfully!', 'success');
            editUserForm.style.display = 'none';
            editSearchInput.value = '';
            if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
        }
    }

    async function deleteUser() {
        const username = deleteUsernameInput.value.trim();
        const category = deleteCategorySelect.value;

        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        if (!confirm(`Permanently delete ${username} from ${category}?`)) return;

        const result = await apiRequest('deleteUser', { username, category });
        if (result) {
            showStatus(`Deleted ${username} successfully`, 'success');
            deleteUsernameInput.value = '';
            if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
        }
    }

    async function resetHwid() {
        const username = resetHwidUsernameInput.value.trim();
        const category = resetHwidCategorySelect.value;

        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        const result = await apiRequest('resetHwid', { username, category });
        if (result) {
            showStatus(`HWID reset for ${username}`, 'success');
            resetHwidUsernameInput.value = '';
            if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
        }
    }

    async function loadUsers() {
        const category = showCategorySelect.value;
        const result = await apiRequest('getUsers', { category: category === 'ALL' ? null : category });
        if (result?.users) {
            userTableBody.innerHTML = result.users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.category}</td>
                    <td>${user.creationDate || 'N/A'}</td>
                    <td>${user.hwid || 'Not set'}</td>
                    <td>${user.expiryDate || 'No expiry'}</td>
                    <td>${user.lastUsed || 'Never'}</td>
                </tr>
            `).join('');
        }
    }

    async function searchUser() {
        const username = searchUsernameInput.value.trim();
        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        const result = await apiRequest('searchUser', { username });
        if (result?.user) {
            searchResultsDiv.innerHTML = `
                <div style="background:#f8f9fa; padding:15px; border-radius:5px;">
                    <h3>${result.user.username}</h3>
                    <p><strong>Category:</strong> ${result.user.category}</p>
                    <p><strong>Created:</strong> ${result.user.creationDate || 'N/A'}</p>
                    <p><strong>HWID:</strong> ${result.user.hwid || 'Not set'}</p>
                    <p><strong>Expiry:</strong> ${result.user.expiryDate || 'No expiry'}</p>
                    <p><strong>Last Login:</strong> ${result.user.lastUsed || 'Never'}</p>
                </div>
            `;
        } else {
            searchResultsDiv.innerHTML = '<p>User not found</p>';
        }
    }

    async function deleteExpiredUsers() {
        if (!confirm('Permanently delete all expired users?')) return;

        const result = await apiRequest('deleteExpired');
        if (result) {
            const count = result.deletedCount || 0;
            showStatus(`Deleted ${count} expired users`, 'success');
            deleteExpiredResults.innerHTML = `<p>Deleted ${count} expired accounts</p>`;
            if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
        }
    }
});
