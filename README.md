# DOTA - Over-the-Air Updates for React Native Apps

### Why DOTA?
- 🚀 Instantly push updates—no app store or distribution delays.
- 🏗️ Full control: run locally or on any supported cloud.
- 🔌 Flexible and extensible: mix, match, and extend with plugins.
- 🧑‍🤝‍🧑 **Cohorting**: Target updates by deployment key, app version, tenant, or RBAC.
- ⚡ **Force Update**: Instantly require users to update by enabling mandatory updates.
- 🗂️ **Version Control**: Multi-version, partitioned, and semantic versioning support.

## ✨ Features

- 🔄 **OTA Updates** for React Native apps
- 🏗️ **Self-hostable**: Run locally, on-prem, or in your cloud
- 🔌 **Pluggable Provider System**: Multi-platform cloud plugin provider
- 🐳 **Docker-First**: Emulated environments with LocalStack, MySQL, and more
- 🛡️ **Secure Auth**: Google OAuth or passwordless authentication mode for local/dev
- 📊 **Metrics & Monitoring**: Optional Redis integration for advanced analytics
- 🛠️ **CLI, Web Dashboard, and API**: Full toolchain for devs and ops

---

## 🔗 Quick Links

- [Delivr Web Panel](https://github.com/ds-horizon/delivr-web-panel)
- [Delivr OTA SDK](https://github.com/ds-horizon/delivr-sdk-ota)
- [Delivr OTA CLI](https://github.com/ds-horizon/delivr-cli)
- [Report an Issue](https://github.com/ds-horizon/delivr-server-ota/issues)
- [API Collection](docs/openapi.yaml)

---

## 📦 Installation and development setup

- Refer to [this doc](docs/DEV_SETUP.md) for installation and development setup.
- For testing with **Mock Server**, see the [E2E Mocks Getting Started Guide](e2e-mocks/GETTING_STARTED.md).

---

## 🚀 Deployment Techniques & Provider Integration

DOTA supports a flexible, plugin-based provider system. You can deploy and scale your update server in any environment:

| Mode      | Storage/DB Plugins           | Cloud Provider | Analytics Plugins | Notes                        |
|-----------|------------------------------|---------------|------------------|------------------------------|
| **Local** | JSON, LocalStack (S3, EC2), MySQL, Postgres, Redis, Azurite | Emulated           | Redis      | All-in-Docker; emulate AWS/Azure; switch DB dialect |
| **AWS**   | S3, EC2, RDS (MySQL/Postgres)| AWS           | OSS Cache      | Use real AWS credentials     |
| **Azure** | Blob Storage, App Service, Azurite, Azure Data Tables | Azure | Azure Redis | Use real Azure credentials |

- **Switch providers** by editing your `.env` and running the setup script.
- **Mix and match** storage, database, and analytics plugins as needed.

## 🔌 Plugin System & Extensibility

DOTA's plugin system lets you extend or replace core features:
- **Storage Plugins**: S3, Azure Blob, local, or custom.
- **Database Plugins**: MySQL, Postgres, or custom (via Sequelize dialects).
- **Auth Plugins**: Google OAuth, passwordless authentication, configurable OAuth Plugin(future, e.g [Guardian](https://guardian.dream11.com/) support).
- **Metrics Plugins**: Redis, OSS Cache, Azure Cache with Cluster Mode.
- **Cohorting Plugins**: Rule-based targeting by attributes (deployment key, app version/range, environment, user cohort, platform, app, tenant, etc.)—fully configurable via plugins.
- **RBAC Plugins**: Inbuilt, configurable (future, e.g. [Casbin](https://github.com/casbin/casbin) support).

> **Impact:** Adapt DOTA to any workflow, compliance need, or infrastructure—just like hot-updater's build, storage, and database plugins.

---

## ⚙️ TechStack Used:

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/)
- [Docker](https://www.docker.com/)
- [Remix](https://remix.run/)
- [Redis](https://redis.io/)
- [Sequelize](https://sequelize.org/)

---

## 🚀 Contribute to DOTA

DOTA is an open-source project and welcomes contributions from the community. For details on how to contribute, please see our [guide to contributing](CONTRIBUTING.md).

---

## ⚖️ License

This code is provided under the MIT License, see the [LICENSE](LICENSE.txt) to learn more.

---

## ✉️ Contact

If you need feedback or support, reach out via the [Issue Tracker](https://github.com/ds-horizon/delivr-server-ota/issues).