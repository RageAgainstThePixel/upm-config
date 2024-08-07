# upm-config

A GitHub Action for setting Unity Engine UPM private scoped registry credentials in CI/CD workflows.

## How to use

### workflow

```yaml
steps:
  - uses: RageAgainstThePixel/upm-config@v1
    with:
      registry-url: 'http://upm.registry.com:4873'
      username: ${{ secrets.UPM_USERNAME }}
      password: ${{ secrets.UPM_PASSWORD }}
```

### inputs

| name | description | required |
| ----------- | ----------- | ----------- |
| `registry-url` | The URL of the private scoped registry. | true |
| `auth-token` | The authentication token for the private scoped registry. | Required if username and password are not provided. |
| `username` | The username for the private scoped registry. | Required if auth-token is not provided. |
| `password` | The password for the private scoped registry. | Required if auth-token is not provided. |
| `always-auth` | Whether to always authenticate with the private scoped registry. Defaults to `true`. | false |
