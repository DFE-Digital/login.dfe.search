# DfE Sign-in Search

**DfE Sign-in Search** provides a fast and efficient API for searching and filtering users within the DfE Sign-in platform using **Azure AI Search**. This service is part of the wider **login.dfe** project.

## Getting Started

### Install Dependencies

```
npm install
```

### Run application

```
npm run dev
```

Once the service is running, the API can be tested locally with the following command:

```
curl https://localhost:44382/users
```

When deployed to an environment, a bearer token is required. The token can be generated with https://github.com/DFE-Digital/login.dfe.jwt-strategies. Once you have the token you can append it to the ``curl`` command in the following way:

```
curl https://<host>/users --header 'Authorization: Bearer <bearer token here>'
```

### Run Tests

Run all tests with:

```
npm run test
```

### Code Quality and Formatting

Run ESLint:

```
npm run lint
```

Automatically fix lint issues:

```
npm run lint:fix
```

### Development Checks

Run linting and tests together:

```
npm run dev:checks
```

### Pre-commit Hooks

Pre-commit hooks are handled automatically via Husky. No additional setup is required.
