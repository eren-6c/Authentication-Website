const { Octokit } = require('@octokit/rest');
const axios = require('axios');

exports.handler = async function(event, context) {
    try {
        const body = JSON.parse(event.body);
        const { action, token } = body;
        
        if (!token) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'GitHub token is required' })
            };
        }

        const octokit = new Octokit({ auth: token });
        const owner = 'waterbuckerfull';
        const repo = 'user.json';
        const path = 'user.json';

        switch (action) {
            case 'getUsers':
                return await handleGetUsers(octokit, owner, repo, path, body.category);
            case 'addUsers':
                return await handleAddUsers(octokit, owner, repo, path, body);
            case 'searchUser':
                return await handleSearchUser(octokit, owner, repo, path, body.username);
            case 'editUser':
                return await handleEditUser(octokit, owner, repo, path, body);
            case 'deleteUser':
                return await handleDeleteUser(octokit, owner, repo, path, body);
            case 'resetHwid':
                return await handleResetHwid(octokit, owner, repo, path, body);
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleGetUsers(octokit, owner, repo, path, category) {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    let users = [];
    for (const [cat, userData] of Object.entries(jsonData)) {
        if (category && cat !== category) continue;
        
        for (const [username, userInfo] of Object.entries(userData)) {
            users.push({
                username,
                category: cat,
                password: userInfo.password || '',
                hwid: userInfo.hwid || '',
                expiryDate: userInfo.expiryDate || 'No Expiry',
                creationDate: userInfo.creationDate || '',
                lastUsed: userInfo.lastUsed || ''
            });
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ users })
    };
}

async function handleAddUsers(octokit, owner, repo, path, { category, expiryDate, users }) {
    // Get current content
    const { data: currentData } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(currentData.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    // Initialize category if it doesn't exist
    if (!jsonData[category]) {
        jsonData[category] = {};
    }

    const creationDate = new Date().toISOString();
    let addedCount = 0;

    for (const user of users) {
        if (!jsonData[category][user.username]) {
            jsonData[category][user.username] = {
                password: user.password,
                hwid: '',
                expiryDate,
                creationDate
            };
            addedCount++;
        }
    }

    // Update file on GitHub
    await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Added ${addedCount} user(s) to ${category}`,
        content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64'),
        sha: currentData.sha
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ message: `${addedCount} user(s) added successfully` })
    };
}

async function handleSearchUser(octokit, owner, repo, path, username) {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    for (const [category, userData] of Object.entries(jsonData)) {
        if (userData[username]) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    user: {
                        username,
                        category,
                        password: userData[username].password || '',
                        hwid: userData[username].hwid || '',
                        expiryDate: userData[username].expiryDate || '',
                        creationDate: userData[username].creationDate || '',
                        lastUsed: userData[username].lastUsed || ''
                    }
                })
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
    };
}

async function handleEditUser(octokit, owner, repo, path, { username, category, updates }) {
    // Get current content
    const { data: currentData } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(currentData.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    // Find and update user
    if (jsonData[category] && jsonData[category][username]) {
        const user = jsonData[category][username];
        
        if (updates.password) user.password = updates.password;
        if (updates.hwid !== undefined) user.hwid = updates.hwid;
        if (updates.expiryDate !== undefined) user.expiryDate = updates.expiryDate;
        if (updates.creationDate !== undefined) user.creationDate = updates.creationDate;
        
        // Update file on GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Updated user ${username}`,
            content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64'),
            sha: currentData.sha
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User updated successfully' })
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
    };
}

async function handleDeleteUser(octokit, owner, repo, path, { username, category }) {
    // Get current content
    const { data: currentData } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(currentData.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    if (jsonData[category] && jsonData[category][username]) {
        delete jsonData[category][username];
        
        // Update file on GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Deleted user ${username}`,
            content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64'),
            sha: currentData.sha
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User deleted successfully' })
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
    };
}

async function handleResetHwid(octokit, owner, repo, path, { username, category }) {
    // Get current content
    const { data: currentData } = await octokit.repos.getContent({
        owner,
        repo,
        path
    });

    const content = Buffer.from(currentData.content, 'base64').toString('utf8');
    const jsonData = JSON.parse(content);

    if (jsonData[category] && jsonData[category][username]) {
        jsonData[category][username].hwid = '';
        
        // Update file on GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Reset HWID for ${username}`,
            content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64'),
            sha: currentData.sha
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'HWID reset successfully' })
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
    };
}
