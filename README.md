# NovelNest Catalog Service

## 1. Project Title and Description

**NovelNest** is an online bookstore platform designed to help book lovers discover, exchange, and manage their book collections. The platform connects readers and facilitates the sharing and trading of physical books within a community.

The **Catalog Service** is a core microservice in the NovelNest ecosystem. It manages the book catalog, including book details, search, and integration with other services (like inventory and orders) via RabbitMQ events. It exposes REST APIs for querying and searching books.

---

## 2. Tech Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Database:** MongoDB
- **Messaging:** RabbitMQ (for event-driven updates)
- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes
- **API Auth:** JWT (JSON Web Tokens)

---

## 3. Project Structure

```
catalog-service/
├── docker-compose.yaml      # Local dev setup for MongoDB, RabbitMQ, and service
├── Dockerfile               # Container image definition
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript config
├── .env                     # Environment variables (not for production)
├── src/
│   ├── db.ts                # MongoDB connection and event processing
│   ├── index.ts             # Main Express app entry point
│   ├── middleware.ts        # JWT authentication middleware
│   └── types.ts             # TypeScript type definitions
```

- **No frontend code** in this service. The UI is in the `frontend/` folder at the root of the monorepo.

---

## 4. Features

- REST API to fetch all books or search/filter books
- JWT-protected endpoints for user-specific book queries
- Consumes book events (create, update, delete) from RabbitMQ
- Stores and updates book data in MongoDB
- Pagination and filtering support for book listings
- Health check endpoint

---

## 5. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or npm
- [Docker](https://www.docker.com/get-started) & [Docker Compose](https://docs.docker.com/compose/)
- [Kubernetes](https://kubernetes.io/) & [kubectl](https://kubernetes.io/docs/tasks/tools/) (for cluster deployment)
- [RabbitMQ](https://www.rabbitmq.com/) (runs via Docker/K8s)
- [MongoDB](https://www.mongodb.com/) (runs via Docker/K8s)

---

## 6. Local Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/NovelNestHQ/catalog-service
   cd catalog-service
   ```

2. **Copy and edit environment variables:**

   ```bash
   cp .env .env.local
   # Edit .env.local as needed
   ```

3. **Start MongoDB, RabbitMQ, and the service using Docker Compose:**

   ```bash
   docker-compose up -d
   ```

   This will start MongoDB, RabbitMQ, and the catalog-service on port 4000.

4. **Install dependencies (if running locally):**

   ```bash
   yarn install
   # or
   npm install
   ```

5. **Run the service in development mode:**

   ```bash
   yarn dev:hot
   # or
   npm run dev:hot
   ```

6. **Access the API:**
   - Health check: [http://localhost:4000/](http://localhost:4000/)
   - Books API: [http://localhost:4000/api/books](http://localhost:4000/api/books)

---

## 7. Deployment to Kubernetes

1. **Ensure you have a running Kubernetes cluster** (e.g., with [kind](https://kind.sigs.k8s.io/) or Minikube).

2. **Navigate to the manifests directory:**

   ```bash
   cd ../k8s-manifests/catalog-service
   ```

3. **Deploy MongoDB and the Catalog Service:**

   ```bash
   ./deploy-catalog-service.sh
   ```

   This script applies both `mongodb-catalog.yaml` and `catalog-service.yaml` and waits for pods to be ready.

4. **Access the service:**
   - The service is exposed as a ClusterIP by default. To access it locally:

     ```bash
     kubectl port-forward svc/catalog-service 4000:4000
     # Now access http://localhost:4000/
     ```

   - In production, access is typically routed via the Kong API Gateway or an Ingress.

---

## 8. Environment Variables

The following environment variables are required (see `.env`):

| Variable        | Description                                 | Example Value                                      |
|-----------------|---------------------------------------------|----------------------------------------------------|
| RABBITMQ_URL    | RabbitMQ connection string                  | amqp://rabbitmq                                    |
| QUEUE_NAME      | RabbitMQ queue name for book events         | messages                                           |
| MONGO_DB        | MongoDB database name                       | books_db                                           |
| MONGODB_URI     | MongoDB connection string                   | mongodb://user:password@mongodb:27017/books_db?authSource=admin |
| JWT_SECRET      | Secret for JWT token verification           | qwertyuiopasdfghjklzxcvbnm123456                   |
| PORT            | Port for the API server                     | 4000                                               |

---

## 9. Sample Data / Testing

- You can use tools like [Postman](https://www.postman.com/) or [curl](https://curl.se/) to test the API endpoints.
- No sample data script is provided in this service, but you can POST book events to RabbitMQ to populate the catalog.
- The `inventory-service/hack/add_books.sh` script (in the monorepo) can be adapted for testing if needed.

---

## 10. Cleanup

- **Docker Compose:**

  ```bash
  docker-compose down -v
  ```

- **Kubernetes:**

  ```bash
  # From k8s-manifests/catalog-service
  kubectl delete -f mongodb-catalog.yaml
  kubectl delete -f catalog-service.yaml
  # Or use the deploy script with a delete flag if available
  ```

---

## 11. Contributing

We welcome contributions! Please fork the repo, create a feature branch, and open a pull request.

---

## 12. License

This project is licensed under the MIT License. See the LICENSE file for details.
