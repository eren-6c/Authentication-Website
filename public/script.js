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
    const editSearchCategory = document.getElementById('edit-search-category');
    const editSearchBtn = document.getElementById('edit-search-btn');
    const editUserForm = document.getElementById('edit-user-form');
    const editUsernameDisplay = document.getElementById('edit-username-display');
    const editUsername = document.getElementById('edit-username');
    const editOriginalCategory = document.getElementById('edit-original-category');
    const editPassword = document.getElementById('edit-password');
    const editCategory = document.getElementById('edit-category');
    const editExpiryDate = document.getElementById('edit-expiry-date');
    const editResetHwid = document.getElementById('edit-reset-hwid');
    const editLoginMessage = document.getElementById('edit-login-message');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

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
    saveEditBtn.addEventListener('click', saveEditedUser);
    cancelEditBtn.addEventListener('click', cancelEdit);
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

            const result = await apiRequest('addUsers', { 
                category, 
                expiryDate, 
                users,
                loginMessage: "🚫 N32 Emulator is currently triggering bans in Free Fire.\n✅ P64 Emulator is safe and not causing bans.\n\n🛡️ We strongly recommend switching to P64 for a safer experience."
            });
            
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
        const category = editSearchCategory.value;
        
        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        const result = await apiRequest('searchUser', { username, category });
        if (result?.user) {
            // Populate the edit form
            editUsername.value = result.user.username;
            editUsernameDisplay.textContent = result.user.username;
            editOriginalCategory.value = result.user.category;
            editPassword.value = result.user.password || '';
            editCategory.value = result.user.category;
            editExpiryDate.value = result.user.expiryDate?.split('T')[0] || '';
            editLoginMessage.value = result.user.loginMessage || '';
            
            // Show the edit form
            editUserForm.style.display = 'block';
            
            showStatus('User found and loaded for editing', 'success');
        } else {
            showStatus('User not found', 'error');
        }
    }

    async function saveEditedUser() {
        const username = editUsername.value;
        const originalCategory = editOriginalCategory.value;
        const newCategory = editCategory.value;
        const password = editPassword.value;
        const expiryDate = editExpiryDate.value;
        const resetHwid = editResetHwid.value === 'yes';
        const loginMessage = editLoginMessage.value;

        if (!username || !password) {
            showStatus('Username and password are required', 'error');
            return;
        }

        const updates = {
            password,
            expiryDate: expiryDate || 'No Expiry',
            loginMessage
        };

        // Only include these if they're being changed
        if (newCategory !== originalCategory) {
            updates.category = newCategory;
        }
        if (resetHwid) {
            updates.hwid = null;
        }

        const result = await apiRequest('editUser', {
            username,
            originalCategory,
            updates
        });

        if (result) {
            showStatus('User updated successfully!', 'success');
            cancelEdit();
            if (document.querySelector('#show-users').classList.contains('active')) loadUsers();
        }
    }

    function cancelEdit() {
        editUserForm.style.display = 'none';
        editSearchInput.value = '';
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
                    <td>${user.hwid ? user.hwid.substring(0, 8) + '...' : 'Not set'}</td>
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
                <div class="user-card">
                    <h3>${result.user.username}</h3>
                    <p><strong>Category:</strong> ${result.user.category}</p>
                    <p><strong>Created:</strong> ${result.user.creationDate || 'N/A'}</p>
                    <p><strong>HWID:</strong> ${result.user.hwid || 'Not set'}</p>
                    <p><strong>Expiry:</strong> ${result.user.expiryDate || 'No expiry'}</p>
                    <p><strong>Last Login:</strong> ${result.user.lastUsed || 'Never'}</p>
                    ${result.user.loginMessage ? `<div style="margin-top:15px; padding:10px; background:#f0f0f0; border-radius:5px; white-space:pre-line;"><strong>Login Message:</strong><br>${result.user.loginMessage}</div>` : ''}
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
