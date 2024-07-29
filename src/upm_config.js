const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs/promises');

async function Run() {
    const registry_url = core.getInput('registry_url', { required: true });
    let auth_token = core.getInput('auth_token');
    if (!auth_token) {
        const username = core.getInput('username', { required: true });
        const password = core.getInput('password', { required: true });
        auth_token = await authenticate(registry_url, username, password);
    }
    else {
        if (!auth_token) {
            throw new Error('No valid authentication method provided!');
        }
    }
    await validate_auth_token(registry_url, auth_token);
    await save_upm_config(registry_url, auth_token);
}

module.exports = { Run };

async function authenticate(registry_url, username, password) {
    const base64_auth = Buffer.from(`${username}:${password}`).toString('base64');
    core.setSecret(base64_auth);
    let output = '';
    await exec.exec('curl', [
        '-X', 'PUT',
        '-H', `Authorization: Basic ${base64_auth}`,
        '-H', 'Content-Type: application/json',
        '-H', 'Accept: application/json',
        `${registry_url}/-/user/org.couchdb.user:${username}`
    ], {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        },
        silent: true
    });
    core.debug(output);
    const response = JSON.parse(output);
    if (response.token) {
        const auth_token = response.token;
        core.setSecret(auth_token);
        return auth_token;
    } else {
        throw new Error(output);
    }
}

async function validate_auth_token(registry_url, auth_token) {
    // validate that the auth token is valid by fetching the list of packages
    let output = '';
    await exec.exec('curl', [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${auth_token}`,
        '-H', 'Content-Type: application/json',
        '-H', 'Accept: application/json',
        `${registry_url}/-/v1/search`
    ], {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        },
        silent: true
    });
    core.debug(output);
    const response = JSON.parse(output);
    if (response.error) {
        throw new Error(response.error);
    }
}

async function save_upm_config(registry_url, auth_token) {
    const upm_config_toml_path = get_upm_config_toml_path();
    try {
        await fs.access(upm_config_toml_path);
    } catch (error) {
        await fs.writeFile(upm_config_toml_path, '');
    }
    if (process.platform !== 'win32') {
        await fs.chmod(upm_config_toml_path, 0o777);
    }
    const upm_config_toml = await fs.readFile(upm_config_toml_path, 'utf-8');
    if (!upm_config_toml.includes(registry_url)) {
        const alwaysAuth = core.getInput('alwaysAuth') === 'true';
        await fs.appendFile(upm_config_toml_path, `registry_url = "${registry_url}"\nauth_token = "${auth_token}"\nalwaysAuth = ${alwaysAuth}\n`);
    }
}

function get_upm_config_toml_path() {
    // macOS and Linux '~/.upmconfig.toml'
    // winodows '%USERPROFILE%\.upmconfig.toml'
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.USERPROFILE, '.upmconfig.toml');
        default:
            return path.join(process.env.HOME, '.upmconfig.toml');
    }
}