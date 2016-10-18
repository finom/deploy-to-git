#!/usr/bin/env node
const { execSync } = require('child_process');

const variablePrefix = 'npm_package_config_deployToGit_';
const fields = {
    repository: true,
    branch: true,
    folder: true,
    commit: true,
    script: true,
    user_name: true,
    user_email: true,
    beforePushScript: false
}
const cwd = process.cwd();
const config = {};

for (const [field, isRequired] of Object.entries(fields)) {
    const configVar = process.env[`${variablePrefix}${field}`];

    if (!configVar && isRequired) {
        throw Error(`deployOnGit requires "${field}" field in package config`);
    }

    if(configVar) {
        config[field] = configVar.replace(/\$([a-zA-Z0-9_]+)/g, (match, envVarName) => {
            const envVar = process.env[envVarName];

            if (!envVar) {
                throw Error(`Environment variable "${envVarName}" presented at string "${configVar}" is missing`);
            }

            return envVar;
        });
    }
}

console.log('Starting deploy to Git...');
console.log(`Cloning the repository to "${config.folder}" folder...`);
try {
    execSync(`git clone -b ${config.branch} ${config.repository} ${config.folder} 2>&1`, { cwd });
} catch (e) {
    throw Error('Failed to clone.');
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

if(config.beforePushScript) {
    console.log('Running beforePushScript...');

    try {
        execSync(`
            cd ${config.folder} &&
            ${config.beforePushScript}
        `, { cwd });
    } catch(e) {
        throw Error('Failed to run beforePushScript.');
    }
}

console.log('Pushing...');
try {
    execSync(`
        cd ${config.folder} &&
        git push --tags ${config.repository} ${config.branch} 2>&1
    `, { cwd });
} catch (e) {
    throw Error('Failed to push.');
}


console.log('Deploying to git is finished.');
