---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description

<!-- A clear and concise description of the feature you'd like -->

## Problem Statement

<!-- Describe the problem this feature would solve -->
<!-- Example: "I'm always frustrated when..." -->

## Proposed Solution

<!-- Describe how you'd like this to work -->

## Alternatives Considered

<!-- Describe any alternative solutions or features you've considered -->

## Use Case

<!-- Describe how this feature would be used -->

## Benefits

<!-- What are the benefits of implementing this feature? -->

## Implementation Details

<!-- Optional: technical details about how this could be implemented -->

## Examples

<!-- Optional: examples from other projects or mockups -->

## Additional Context

<!-- Add any other context, screenshots, or examples about the feature request -->

## Checklist

- [ ] I have searched for similar feature requests
- [ ] This feature aligns with the project goals
- [ ] I am willing to help implement this feature

# Contributing to Snow Globe Controller

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to this project.

## Development Setup

1. **Prerequisites**
   - Node.js 22.0.0 or higher
   - npm (comes with Node.js)
   - Git

2. **Installation**

   ```bash
   git clone https://github.com/yourusername/snow-globe-controller.git
   cd snow-globe-controller
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env.local`
   - Add your Firebase configuration

## Code Quality Standards

### Before Submitting

Run these commands to ensure your code meets our quality standards:

```bash
# Type check
npm run type-check

# Lint and fix issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm run test

# Run all checks
npm run validate
```

### Code Style

- We use **Prettier** for code formatting
- We use **ESLint** for code linting
- TypeScript strict mode is enabled
- All new code should have tests

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:

```
feat: add theme preview functionality
fix: resolve queue position calculation bug
test: add tests for session service
docs: update API documentation
```

## Testing Guidelines

### Writing Tests

1. **Unit Tests** - Test individual functions and components
   - Location: `__tests__` folders next to source files
   - Naming: `*.test.ts` or `*.test.tsx`

2. **Integration Tests** - Test feature workflows
   - Location: `__tests__` folders
   - Naming: `*.integration.test.ts`

3. **Test Coverage**
   - Aim for minimum 50% coverage (enforced)
   - Critical paths should have 80%+ coverage
   - Run `npm test` to see coverage report

### Test Best Practices

```typescript
// Good: Descriptive test names
it('should activate first user when queue becomes active', async () => {
  // ...
});

// Bad: Vague test names
it('works', () => {
  // ...
});

// Good: Arrange-Act-Assert pattern
it('should save session data to Firestore', async () => {
  // Arrange
  const sessionData = createMockSession();

  // Act
  await saveThemeSession(sessionData);

  // Assert
  expect(addDoc).toHaveBeenCalledWith(...);
});
```

## Pull Request Process

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Locally**

   ```bash
   npm run validate
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a Pull Request on GitHub

6. **PR Requirements**
   - All CI checks must pass
   - Code review approval required
   - No merge conflicts
   - Tests must pass
   - Coverage should not decrease

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Write clear PR descriptions
- Respond to feedback promptly
- Update tests when changing functionality

### For Reviewers

- Be constructive and respectful
- Focus on code quality and correctness
- Check test coverage
- Verify documentation updates

## Project Structure

```
snow-globe-controller/
├── app/              # Next.js pages
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Core business logic
│   └── __tests__/   # Unit tests
├── scripts/         # Utility scripts
├── docs/            # Documentation
└── .github/         # CI/CD workflows
```

## Questions or Issues?

- Check existing issues on GitHub
- Join discussions in GitHub Discussions
- Read the documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
