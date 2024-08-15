import core = require('@actions/core');
import exec = require('@actions/exec');
import path = require('path');
import fs = require('fs');

async function Run() {
    const registry_url = core.getInput('registry-url', { required: true });
    let auth_token = core.getInput('auth-token');
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

export { Run }

async function authenticate(registry_url, username, password) {
    core.debug('Authenticating...');
    const ascii_auth = Buffer.from(`${username}:${password}`).toString('ascii');
    const base64_auth = Buffer.from(ascii_auth).toString('base64');
    core.setSecret(base64_auth);
    const payload = {
        name: username,
        password: password,
    };
    let output = '';
    await exec.exec('curl', [
        '-X', 'PUT',
        '-H', 'Accept: application/json',
        '-H', 'Content-Type: application/json',
        '-H', `Authorization: Basic ${base64_auth}`,
        `${registry_url}/-/user/org.couchdb.user:${username}`,
        '-d', JSON.stringify(payload)
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
        throw new Error(response.error);
    }
}

async function validate_auth_token(registry_url, auth_token) {
    core.debug('Validating the auth token...');
    let output = '';
    await exec.exec('curl', [
        '-X', 'GET',
        '-H', 'Accept: application/json',
        '-H', 'Content-Type: application/json',
        '-H', `Authorization: Bearer ${auth_token}`,
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
    core.debug('Saving .upmconfig.toml...');
    const upm_config_toml_path = get_upm_config_toml_path();
    try {
        await fs.promises.access(upm_config_toml_path);
    } catch (error) {
        await fs.promises.writeFile(upm_config_toml_path, '');
    }
    if (process.platform !== 'win32') {
        await fs.promises.chmod(upm_config_toml_path, 0o777);
    }
    const upm_config_toml = await fs.promises.readFile(upm_config_toml_path, 'utf-8');
    if (!upm_config_toml.includes(registry_url)) {
        const alwaysAuth = core.getInput('always-auth') === 'true';
        await fs.promises.appendFile(upm_config_toml_path, `registry_url = "${registry_url}"\nauth_token = "${auth_token}"\nalwaysAuth = ${alwaysAuth}\n`);
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