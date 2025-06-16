async function deleteUser(username, category) {
    // Validate inputs
    if (!username || !category) {
        showStatus('Invalid user information provided for deletion', 'error');
        return;
    }

    if (!githubToken) {
        showStatus('Please enter and save your GitHub token first', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to permanently delete user ${username} from ${category}?`)) {
        return;
    }

    try {
        showStatus(`Deleting user ${username}...`, 'info');
        
        console.log('Sending delete request for:', username, 'in category:', category);
        
        const response = await fetch('/.netlify/functions/github', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteUser',
                token: githubToken,
                username: username,
                category: category
            })
        });

        console.log('Received response:', response);

        const result = await response.json();
        console.log('Result data:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete user');
        }

        showStatus(`User ${username} deleted successfully!`, 'success');
        
        // Refresh the user list after a short delay
        setTimeout(() => {
            if (document.querySelector('#show-users').classList.contains('active')) {
                console.log('Refreshing user list after deletion');
                loadUsers();
            }
        }, 1000);
    } catch (error) {
        console.error('Detailed delete error:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
        showStatus(`Error deleting user: ${error.message}`, 'error');
    }
}
