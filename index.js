#!/usr/bin/env node
const { execSync } = require('child_process');

const variablePrefix = 'npm_package_config_deployToGit_';
const fields = ['repository', 'branch', 'folder', 'commit', 'script', 'user_name', 'user_email'];
const cwd = process.cwd();
const config = {};

for (const field of fields) {
    const configVar = process.env[`${variablePrefix}${field}`];

    if (!configVar) {
        throw Error(`deployOnGit requires "${field}" field in package config`);
    }

    config[field] = configVar.replace(/\$([a-zA-Z0-9_]+)/g, (match, envVarName) => {
        const envVar = process.env[envVarName];

        if (!envVar) {
            throw Error(`Environment variable "${envVarName}" presented at string "${configVar}" is missing`);
        }

        return envVar;
    });
}

console.log('Starting deploy to Git...');
console.log(`Cloning the repository to "${config.folder}" folder...`);
try {
    execSync(`git clone -b ${config.branch} ${config.repository} ${config.folder} 2>&1`, { cwd });
} catch (e) {
    throw Error('Failed to clone. Check the repository name, permissions to clone and the absence of "${config.folder}" folder.');
}


console.log(`Starting script "${config.script}"...`);
console.log(execSync(`${config.script}`, { cwd }).toString('utf-8'));

console.log('Configuring and committing...');
execSync(`
    cd ${config.folder} &&
    git config user.email "${config.user_email}" &&
    git config user.name "${config.user_name}" &&
    git add . &&
    git commit --allow-empty -m "${config.commit}" 2>&1
`, { cwd });

console.log('Pushing...');
try {
    execSync(`
        cd ${config.folder} &&
        git push ${config.repository} ${config.branch} 2>&1
    `, { cwd });
} catch (e) {
    throw Error('Failed to push.');
}


console.log('Deploying to git is finished.');
