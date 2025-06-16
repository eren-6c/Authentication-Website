document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sidebarItems = document.querySelectorAll('.sidebar li');
    const sections = document.querySelectorAll('main section');
    const statusMessage = document.getElementById('status-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    const githubTokenInput = document.getElementById('github-token');
    const saveTokenBtn = document.getElementById('save-token');

    // Delete User Elements
    const deleteUsernameInput = document.getElementById('delete-username');
    const deleteCategorySelect = document.getElementById('delete-category');
    const deleteUserBtn = document.getElementById('delete-user-btn');

    // Reset HWID Elements
    const resetHwidUsernameInput = document.getElementById('reset-hwid-username');
    const resetHwidCategorySelect = document.getElementById('reset-hwid-category');
    const resetHwidBtn = document.getElementById('reset-hwid-btn');

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
    
    // Event Listeners
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            showSection(sectionId);
            updateActiveNav(item);
        });
    });

    saveTokenBtn.addEventListener('click', saveToken);
    deleteUserBtn.addEventListener('click', handleDeleteUser);
    resetHwidBtn.addEventListener('click', handleResetHwid);
    searchUserBtn.addEventListener('click', handleSearchUser);
    deleteExpiredBtn.addEventListener('click', handleDeleteExpired);

    // Functions
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
    }

    function updateActiveNav(activeItem) {
        sidebarItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    function saveToken() {
        githubToken = githubTokenInput.value.trim();
        if (!githubToken) {
            showStatus('Please enter a GitHub token', 'error');
            return;
        }
        localStorage.setItem('githubToken', githubToken);
        showStatus('GitHub token saved successfully!', 'success');
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
            
            if (!response.ok) {
                throw new Error(result.error || `API request failed: ${action}`);
            }

            return result;
        } catch (error) {
            console.error(`${action} error:`, error);
            showStatus(error.message, 'error');
            return null;
        } finally {
            showLoading(false);
        }
    }

    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    // Delete User Functionality
    async function handleDeleteUser() {
        const username = deleteUsernameInput.value.trim();
        const category = deleteCategorySelect.value;

        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${username} from ${category}?`)) {
            return;
        }

        const result = await apiRequest('deleteUser', { username, category });
        if (result) {
            showStatus(`User ${username} deleted successfully`, 'success');
            deleteUsernameInput.value = '';
        }
    }

    // Reset HWID Functionality
    async function handleResetHwid() {
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
        }
    }

    // Search User Functionality
    async function handleSearchUser() {
        const username = searchUsernameInput.value.trim();
        
        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        const result = await apiRequest('searchUser', { username });
        if (result && result.user) {
            displaySearchResult(result.user);
        } else {
            searchResultsDiv.innerHTML = '<p>User not found</p>';
        }
    }

    function displaySearchResult(user) {
        searchResultsDiv.innerHTML = `
            <div class="user-card">
                <h3>${user.username}</h3>
                <p><strong>Category:</strong> ${user.category}</p>
                <p><strong>Created:</strong> ${user.creationDate || 'N/A'}</p>
                <p><strong>HWID:</strong> ${user.hwid || 'Not set'}</p>
                <p><strong>Expiry:</strong> ${user.expiryDate || 'No expiry'}</p>
                <p><strong>Last Login:</strong> ${user.lastUsed || 'Never'}</p>
            </div>
        `;
    }

    // Delete Expired Functionality
    async function handleDeleteExpired() {
        if (!confirm('Are you sure you want to delete all expired users? This cannot be undone.')) {
            return;
        }

        const result = await apiRequest('deleteExpired');
        if (result) {
            const count = result.deletedCount || 0;
            showStatus(`Deleted ${count} expired users`, 'success');
            deleteExpiredResults.innerHTML = `<p>Deleted ${count} expired user accounts</p>`;
        }
    }
});
