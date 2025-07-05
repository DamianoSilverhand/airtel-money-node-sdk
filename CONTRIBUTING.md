# Contributing to airtel-money-node-sdk

Thank you for your interest in contributing to the **airtel-money-node-sdk**! Your help is highly appreciated. To ensure a smooth collaboration, please follow these guidelines.

---

## 1. Getting Started

- **Fork** the repository to your own GitHub account.
- **Clone** your fork to your local machine.
- **Install dependencies** using:
  ```bash
  npm install
  ```
- Create a copy of the environment file for local development:
  ```bash
  cp env.example .env
  ```
- Fill in the `.env` file with your test credentials (do **not** commit secrets).

---

## 2. Branching Strategy

- **Create a new branch** for each contribution.
- **Branch naming convention:**
  ```
  <your-github-username>/<short-description>
  ```
  **Example:**
  ```
  wamunyimamukelabai/fix-token-caching
  ```
- Never commit directly to the `main` branch.

---

## 3. Commit Message Guidelines

- Use **conventional commit** prefixes for clarity:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring (no feature or bug fix)
  - `test:` for adding or updating tests
  - `chore:` for maintenance (build, deps, etc.)
- **Example commit messages:**
  - `feat: add support for v2 payment encryption`
  - `fix: correct polling interval logic`
  - `docs: update README with usage examples`
  - `refactor: simplify bearer token caching logic`

---

## 4. Pull Request Process

- **Sync** your branch with the latest `main` before submitting a PR.
- **Open a pull request** to the `main` branch.
- **Describe your changes** clearly in the PR description.
- Reference related issues (if any) using `Closes #issue_number`.
- Ensure your code:
  - Passes linting and builds (if applicable)
  - Does not include sensitive data or secrets
  - Is well-documented and tested

---

## 5. Code Style

- Follow the existing code style and structure.
- Use clear, descriptive variable and function names.
- Add comments where necessary, especially for complex logic.
- Keep functions small and focused.

---

## 6. Documentation

- Update the `README.md` or add relevant documentation for any new features or changes.
- If you add new environment variables, update `env.example` and the documentation table.

---

## 7. Issue Reporting

- Use the [GitHub Issues](https://github.com/DamianoSilverhand/airtel-money-node-sdk/issues) page to report bugs or request features.
- Provide as much detail as possible (steps to reproduce, logs, environment, etc.).

---

## 8. Code of Conduct

- Be respectful and inclusive in all interactions.
- See the [Contributor Covenant](https://www.contributor-covenant.org/) for guidance.

---

## 9. License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make airtel-money-node-sdk better!**
