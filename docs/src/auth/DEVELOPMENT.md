# 🛠️ Development Tools & Commands

This guide provides essential commands for local development and testing without requiring custom scripts.

## 🧪 **Testing & Quality**

### Run tests locally
```bash
# Install dependencies
npm ci

# Run all tests with coverage
npm run test:cov

# Run e2e tests  
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

### SonarQube analysis (local)
```bash
# Prerequisites: Configure environment variables
export SONAR_TOKEN=your_token_here
export SONAR_HOST_URL=https://sonarcloud.io

# Run tests with coverage first
npm run test:cov

# Run SonarQube analysis
npx sonar-scanner
```

## 🐳 **Docker Operations**

### Build and test locally
```bash
# Build Docker image
docker build -t auth-service:local .

# Test the image
docker run -d --name test-auth -p 3001:3001 auth-service:local

# Check health
curl http://localhost:3001/health

# Cleanup
docker stop test-auth && docker rm test-auth
```

## 🔐 **SBOM & Security Analysis**

### Generate SBOM locally
```bash
# Install syft (one time, pinned version with checksum verification)
SYFT_VERSION="v0.104.0"
SYFT_TARBALL="syft_${SYFT_VERSION}_linux_amd64.tar.gz"
SYFT_URL="https://github.com/anchore/syft/releases/download/${SYFT_VERSION}/${SYFT_TARBALL}"
SYFT_SHA256_URL="${SYFT_URL}.sha256"

# Download tarball and checksum
curl -sSL -o "${SYFT_TARBALL}" "${SYFT_URL}"
curl -sSL -o "${SYFT_TARBALL}.sha256" "${SYFT_SHA256_URL}"

# Verify checksum
sha256sum -c "${SYFT_TARBALL}.sha256"

# Extract and install
tar -xzf "${SYFT_TARBALL}" syft
install -m 0755 syft /usr/local/bin/syft

# Clean up
rm syft "${SYFT_TARBALL}" "${SYFT_TARBALL}.sha256"

# Generate SBOM
syft auth-service:local -o spdx-json > sbom.json

# View SBOM summary
cat sbom.json | jq '.packages | length'
```

### Vulnerability scanning
```bash
# Install grype (one time, version-pinned & checksum-verified)
GRYPE_VERSION="v0.74.0"
GRYPE_TAR="grype_${GRYPE_VERSION}_linux_amd64.tar.gz"
GRYPE_URL="https://github.com/anchore/grype/releases/download/${GRYPE_VERSION}/${GRYPE_TAR}"
GRYPE_SHA256_URL="https://github.com/anchore/grype/releases/download/${GRYPE_VERSION}/checksums.txt"

# Download Grype tarball and checksums
curl -sSL "$GRYPE_URL" -o "$GRYPE_TAR"
curl -sSL "$GRYPE_SHA256_URL" -o "checksums.txt"

# Verify checksum
grep "$GRYPE_TAR" checksums.txt | sha256sum -c -

# Extract and install
tar -xzf "$GRYPE_TAR"
sudo mv grype /usr/local/bin/
rm "$GRYPE_TAR" checksums.txt

# Scan for vulnerabilities
grype auth-service:local

# Scan SBOM
grype sbom:sbom.json
```

### Verify attestations (for published images)
```bash
# Prerequisites: GitHub CLI authentication
gh auth login

# Verify image attestations
gh attestation verify oci://ghcr.io/whispr-messenger/auth-service:latest \
  --repo whispr-messenger/auth-service

# Download attestations for analysis
gh attestation download oci://ghcr.io/whispr-messenger/auth-service:latest \
  --repo whispr-messenger/auth-service \
  --predicate-type https://spdx.dev/Document \
  --output-dir ./attestations
```

## 🔧 **CI/CD Operations**

### Trigger workflows manually
```bash
# Trigger specific workflow
gh workflow run docker.yml

# List workflow runs
gh run list

# View specific run
gh run view <run-id>
```

### Check pipeline status
```bash
# Get latest run status
gh run list --limit 1

# Watch current run
gh run watch
```

## 📊 **Monitoring & Debugging**

### View logs
```bash
# View workflow logs
gh run view <run-id> --log

# View specific job logs  
gh run view <run-id> --job <job-name> --log
```

### Download artifacts
```bash
# List artifacts from latest run
gh run list --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run download

# Download specific artifact
gh run download <run-id> -n sbom-analysis
```

## 🚀 **Quick Commands**

### Full local validation (before push)
```bash
npm ci && npm run lint && npm run test:cov && npm run build
```

### Security check
```bash
docker build -t auth-service:security . && grype auth-service:security
```

### Complete SBOM analysis
```bash
docker build -t auth-service:sbom . && \
syft auth-service:sbom -o spdx-json > sbom.json && \
grype sbom:sbom.json
```

## 📚 **Tool Installation**

### One-time setup
```bash
# Install analysis tools (Syft & Grype) with version pinning and checksum verification
SYFT_VERSION="v1.0.0"   # <-- Update to desired version
GRYPE_VERSION="v1.0.0"  # <-- Update to desired version

# Install Syft
curl -sSLO https://github.com/anchore/syft/releases/download/${SYFT_VERSION}/syft_${SYFT_VERSION#v}_linux_amd64.tar.gz
curl -sSLO https://github.com/anchore/syft/releases/download/${SYFT_VERSION}/syft_${SYFT_VERSION#v}_checksums.txt
grep "syft_${SYFT_VERSION#v}_linux_amd64.tar.gz" syft_${SYFT_VERSION#v}_checksums.txt | sha256sum -c -
tar -xzf syft_${SYFT_VERSION#v}_linux_amd64.tar.gz
sudo mv syft /usr/local/bin/
rm syft_${SYFT_VERSION#v}_linux_amd64.tar.gz syft_${SYFT_VERSION#v}_checksums.txt

# Install Grype
curl -sSLO https://github.com/anchore/grype/releases/download/${GRYPE_VERSION}/grype_${GRYPE_VERSION#v}_linux_amd64.tar.gz
curl -sSLO https://github.com/anchore/grype/releases/download/${GRYPE_VERSION}/grype_${GRYPE_VERSION#v}_checksums.txt
grep "grype_${GRYPE_VERSION#v}_linux_amd64.tar.gz" grype_${GRYPE_VERSION#v}_checksums.txt | sha256sum -c -
tar -xzf grype_${GRYPE_VERSION#v}_linux_amd64.tar.gz
sudo mv grype /usr/local/bin/
rm grype_${GRYPE_VERSION#v}_linux_amd64.tar.gz grype_${GRYPE_VERSION#v}_checksums.txt

# Install GitHub CLI (if not already installed)
# See: https://cli.github.com/

# SonarQube scanner (optional for local analysis)
npm install -g sonar-scanner
```

## 🎯 **Best Practices**

1. **Use the CI/CD pipeline** for official analysis and validation
2. **Run local checks** only for quick feedback during development  
3. **Trust the pipeline** - it has the same tools with proper configuration
4. **Use GitHub CLI** for attestation verification instead of custom scripts
5. **Keep it simple** - standard tools are better than custom scripts

## 🔗 **Useful Links**

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Syft Documentation](https://github.com/anchore/syft)
- [Grype Documentation](https://github.com/anchore/grype)
- [SonarQube Scanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)