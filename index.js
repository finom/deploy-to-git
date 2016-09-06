#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const variablePrefix = 'npm_package_config_deployToGit_';
const fields = ['repository', 'branch', 'folder', 'commit', 'script', 'user_name', 'user_email'];
const cwd = process.cwd();
const config = {};

for(const field of fields) {
    const configVar = process.env[`${variablePrefix}${field}`];

    if(!configVar) {
        throw Error(`deployOnGit requires "${field}" field in package config`);
    }

    config[field] = configVar.replace(/\$([a-zA-Z0-9_]+)/g, (match, envVarName) => {
        const envVar = process.env[envVarName];

        if(!envVar) {
            throw Error(`Environment variable "${envVarName}" presented at string "${configVar}" is missing`)
        }

        return envVar;
    });
}

execSync(`
    git clone -b ${config.branch} ${config.repository} ${config.folder} &&
    ${config.script} &&
    cd ${config.folder} &&
    git config user.email "${config.user_email}" &&
    git config user.name "${config.user_name}" &&
    git add . &&
    git commit --allow-empty -m "${config.commit}" &&
    git push ${config.repository} ${config.branch}
`, { cwd });
