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
    await exec.exec('curl', [
        '-X', 'POST',
        '-H', `Authorization: Basic ${base64_auth}`,
        '-H', 'Content-Type: application/json',
        '-H', 'Accept: application/json',
        `${registry_url}/-/user/org.couchdb.user:${username}`
    ], {
        listeners: {
            stdout: (data) => {
                const response = JSON.parse(data.toString());
                if (response.ok) {
                    const auth_token = response.token;
                    core.setSecret(auth_token);
                    return auth_token;
                } else {
                    throw new Error(`${response.error}: ${response.reason}`);
                }
            }
        }
    });
    throw new Error('Authentication failed');
}

async function validate_auth_token(registry_url, auth_token) {
    // validate that the auth token is valid by fetching the list of packages
    await exec.exec('curl', [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${auth_token}`,
        '-H', 'Content-Type: application/json',
        '-H', 'Accept: application/json',
        `${registry_url}/-/v1/search`
    ], {
        listeners: {
            stdout: (data) => {
                core.debug(data.toString());
                const response = JSON.parse(data.toString());
                if (response.ok === true) {
                    return;
                } else {
                    throw new Error(response.error);
                }
            }
        }
    });
}

async function save_upm_config(registry_url, auth_token) {
    const upm_config_toml_path = get_upm_config_toml_path();
    try {
        await fs.access(upm_config_toml_path);
    } catch (error) {
        // create .upmconfig.toml
        await fs.writeFile(upm_config_toml_path, '');
    }
    // update .upmconfig.toml with registry_url and auth_token
    // check if registry_url and auth_token are already present
    // if not, append them to the file
    const upm_config_toml = await fs.readFile(upm_config_toml_path, 'utf-8');
    if (!upm_config_toml.includes(registry_url)) {
        const alwaysAuth = core.getInput('alwaysAuth') === 'true';
        await fs.appendFile(upm_config_toml_path, `registry_url = "${registry_url}"\nauth_token = "${auth_token}"\nalwaysAuth = ${alwaysAuth}\n`);
    }
}

function get_upm_config_toml_path() {
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.USERPROFILE, '.upmconfig.toml');
        default:
            return path.join(process.env.HOME, '.upmconfig.toml');
    }
}