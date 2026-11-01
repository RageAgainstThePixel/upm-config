# upm-config

A GitHub Action for setting Unity Engine UPM private scoped registry credentials in CI/CD workflows.

Writes an `[npmAuth."<registry-url>"]` entry to the user's `.upmconfig.toml` (`$HOME` on macOS and Linux, `%USERPROFILE%` on Windows) after validating the token against the registry.

## How to use

### workflow

```yaml
steps:
  - uses: RageAgainstThePixel/upm-config@v2
    with:
      registry-url: 'http://upm.registry.com:4873'
      username: ${{ secrets.UPM_USERNAME }}
      password: ${{ secrets.UPM_PASSWORD }}
```

or with an existing auth token:

```yaml
steps:
  - uses: RageAgainstThePixel/upm-config@v2
    with:
      registry-url: 'http://upm.registry.com:4873'
      auth-token: ${{ secrets.UPM_AUTH_TOKEN }}
```

### inputs

| name | description | required |
| ---- | ----------- | -------- |
| `registry-url` | The URL of the private scoped registry. | true |
| `auth-token` | The authentication token for the private scoped registry. | Required if username and password are not provided. |
| `username` | The username for the private scoped registry. | Required if auth-token is not provided. |
| `password` | The password for the private scoped registry. | Required if auth-token is not provided. |
| `always-auth` | Whether to always authenticate with the private scoped registry. Defaults to `true`. | false |
| `overwrite` | Whether to overwrite the existing configuration file. Defaults to `false`. | false |
