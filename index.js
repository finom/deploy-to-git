#!/usr/bin/env node
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { argv } = yargs(hideBin(process.argv));

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
};
const cwd = process.cwd();
const config = {};

for (const [field, isRequired] of Object.entries(fields)) {
    const configVar = argv[field] || process.env[`${variablePrefix}${field}`];

    if (!configVar && isRequired) {
        throw Error(`deployOnGit requires "${field}" field in package config`);
    }

    if (configVar) {
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

execSync(`git clone -b ${config.branch} ${config.repository} ${config.folder}`, { cwd, stdio: 'inherit' });

console.log(`Starting script "${config.script}"...`);
execSync(`${config.script}`, { cwd, stdio: 'inherit' });

console.log('Configuring and committing...');
execSync([
    `cd ${config.folder}`,
    `git config user.email "${config.user_email}"`,
    `git config user.name "${config.user_name}"`,
    'git add .',
    `git commit --allow-empty -m "${config.commit}"`
].join('&&'), { cwd, stdio: 'inherit' });

if (config.beforePushScript) {
    console.log('Running beforePushScript...');

    execSync(`cd ${config.folder} && ${config.beforePushScript}`, { cwd, stdio: 'inherit' });
}

console.log('Pushing...');

execSync(`cd ${config.folder} && git push --tags ${config.repository} ${config.branch}`, { cwd, stdio: 'inherit' });

console.log('Deploying to git is finished.');
