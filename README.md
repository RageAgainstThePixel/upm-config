# upm-config

A GitHub action for setting Unity UPM private scoped registry credentials.

## How to use

### workflow

```yaml
steps:
  - uses: RageAgainstThePixel/upm-config@v1
    with:
      registry_url: 'http://upm.registry.com:4873'
      username: ${{ secrets.UPM_USERNAME }}
      password: ${{ secrets.UPM_PASSWORD }}

```

### inputs

| name | description | required |
| ---- | ----------- | -------- |
| registry_url | The URL of the private scoped registry. | true |
| auth_token | The authentication token for the private scoped registry. | Required if username and password are not provided. |
| username | The username for the private scoped registry. | Required if auth_token is not provided. |
| password | The password for the private scoped registry. | Required if auth_token is not provided. |
| always_auth | Whether to always authenticate with the private scoped registry. Defaults to true. | false |
