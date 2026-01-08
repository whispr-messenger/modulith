# 🏷️ Auto-Labeller Documentation

This directory contains the configuration and scripts for automatically labeling pull requests and issues in the auth-service repository.

## 📁 Files Overview

### Core Configuration Files

- **`labeler.yml`** - Auto-labeller configuration that maps file patterns to labels
- **`labels.yml`** - Complete label definitions with colors and descriptions
- **`setup-labels.sh`** - Script to create/update all labels in the repository
- **`workflows/labeler.yml`** - GitHub Actions workflow for auto-labelling

## 🚀 Getting Started

### 1. Set Up Repository Labels

First, create all the labels in your repository:

```bash
# Make sure you're in the repository root
cd /path/to/auth-service

# Run the setup script
./.github/setup-labels.sh
```

**Prerequisites:**
- GitHub CLI (`gh`) must be installed and authenticated
- You need admin access to the repository

### 2. Enable Auto-Labelling

The auto-labeller workflow is automatically triggered when:
- Pull requests are opened, edited, synchronized, or reopened
- Pull requests are marked as ready for review

No additional setup is required - the workflow will start working immediately after the files are committed.

## 🏷️ Label Categories

### Priority Labels
- 🔥 **priority:high** - Critical issues requiring immediate attention
- ⚡ **priority:medium** - Important issues to address soon
- 📝 **priority:low** - Nice to have improvements

### Size Labels (Automatically Applied)
- 📏 **size:XS** - 1-10 lines changed
- 📏 **size:S** - 11-100 lines changed
- 📏 **size:M** - 101-500 lines changed
- 📏 **size:L** - 501-1000 lines changed
- 📏 **size:XL** - 1000+ lines changed

### Component Labels

#### Authentication & Security
- 🔐 **auth:core** - Core authentication functionality
- 🎫 **auth:tokens** - JWT token management
- 🔒 **auth:2fa** - Two-factor authentication
- 📱 **auth:devices** - Device management
- 🔑 **security:crypto** - Cryptography and encryption
- 🛡️ **security:guards** - Security guards and middleware
- ⏱️ **security:rate-limit** - Rate limiting

#### Infrastructure & APIs
- 🗄️ **database** - Database entities and migrations
- ⚙️ **config** - Configuration files
- 💊 **health** - Health checks and monitoring
- 🎮 **api:controllers** - API controllers
- 🔗 **api:grpc** - gRPC services
- 📋 **api:dto** - Data Transfer Objects

#### DevOps
- 🐳 **devops:docker** - Docker containers
- ⚡ **devops:ci-cd** - CI/CD workflows
- 🌐 **devops:nginx** - Nginx configuration
- 📜 **devops:scripts** - Scripts and automation

#### Documentation
- 📐 **docs:architecture** - Architecture documentation
- 📋 **docs:specs** - Specifications
- 🔧 **docs:operations** - Operational documentation
- 🔗 **docs:integration** - Integration guides
- 📊 **docs:governance** - Governance and ADRs

## 🤖 Automated Features

### Smart PR Analysis

The labeller workflow automatically:

1. **Analyzes file changes** and applies appropriate component labels
2. **Calculates PR size** based on lines of code changed
3. **Detects priority level** based on critical file modifications
4. **Identifies change types** (security, database, testing, etc.)
5. **Suggests reviewers** based on affected components
6. **Validates PR format** and provides feedback

### PR Validation Checklist

The workflow automatically comments on PRs with:
- ✅ Title format validation (conventional commits)
- ✅ Description completeness check
- ⚠️ Breaking change detection
- ✅ Testing mention verification
- 📋 Complete review checklist

## 🎯 Customization

### Adding New Labels

1. **Update `labeler.yml`** to add file pattern mappings
2. **Update `labels.yml`** to define the new label
3. **Update `setup-labels.sh`** to include the new label creation
4. **Run the setup script** to create the new label

Example addition to `labeler.yml`:
```yaml
'🎨 ui:components':
  - 'src/components/**/*'
  - 'src/ui/**/*'
```

### Modifying Auto-Assignment Rules

Edit the `workflows/labeler.yml` file to customize:
- **Priority detection logic** in the "Analyze PR Impact" step
- **Reviewer assignment rules** in the "Auto-assign Reviewers" step
- **Validation criteria** in the "PR Checklist Validation" step

### File Pattern Examples

The `labeler.yml` supports various pattern matching:

```yaml
# Exact file matches
'🔐 auth:core':
  - 'src/services/auth.service.ts'

# Directory patterns
'🗄️ database':
  - 'src/entities/**/*'
  - 'src/migrations/**/*'

# Wildcard patterns
'🧪 tests:unit':
  - '**/*.spec.ts'

# Multiple conditions (any match)
'🔑 security:crypto':
  - any: ['**/*crypto*.ts', '**/*encryption*.ts']
```

## 🔧 Troubleshooting

### Labels Not Being Applied

1. **Check workflow permissions** - Ensure the workflow has `pull-requests: write` permission
2. **Verify file patterns** - Test your patterns against actual file paths
3. **Check workflow logs** - Look at the Actions tab for error messages

### Setup Script Issues

1. **GitHub CLI authentication**:
   ```bash
   gh auth status
   gh auth login  # if not authenticated
   ```

2. **Repository access**:
   ```bash
   gh repo view  # should show current repository
   ```

### Performance Considerations

- The workflow runs on every PR update
- Large PRs (1000+ lines) may take longer to analyze
- Consider using draft PRs for work-in-progress to avoid unnecessary runs

## 📊 Analytics and Reporting

You can use GitHub's insights to track:
- **Label usage statistics** - See which components are most active
- **PR review times** by label category
- **Team workload distribution** based on auto-assigned reviewers

## 🤝 Contributing

When contributing to the labeller system:

1. **Test label patterns** with realistic file paths
2. **Validate workflow syntax** using GitHub's workflow validator
3. **Update documentation** when adding new features
4. **Test with draft PRs** before merging changes

## 📚 Additional Resources

- [GitHub Labeler Action Documentation](https://github.com/actions/labeler)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Auth Service Architecture Documentation](../documentation/1_architecture/)

---

*This auto-labeller system is designed specifically for the auth-service repository's NestJS architecture and microservice patterns.*