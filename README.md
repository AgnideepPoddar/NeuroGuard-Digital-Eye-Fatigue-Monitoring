# 👁️ NeuroGuard — Real-Time Eye Fatigue Monitor

NeuroGuard is a full-stack web application designed for **real-time eye fatigue detection and monitoring**. It combines computer vision, behavioral metrics, and hybrid deep learning models to analyze eye activity and provide fatigue alerts, helping users maintain healthy screen habits and improve productivity.

---

## 🚀 Features

- 👁️ **Real-Time Eye Fatigue Detection**
  - Uses **MediaPipe Face Mesh** for facial landmark extraction.
  - Tracks eye movements and blinking patterns continuously.

- 📊 **Fatigue Metrics**
  - **EAR (Eye Aspect Ratio)** for eye openness analysis.
  - **PERCLOS (Percentage of Eye Closure)** for drowsiness estimation.
  - **Blink Rate Monitoring** to detect abnormal fatigue patterns.

- 🧠 **Hybrid Deep Learning Models**
  - **CNN + LSTM**
  - **ResNet + LSTM**
  - **DenseNet + LSTM**

- 🔔 **Smart Alert System**
  - Real-time fatigue warnings.
  - Session-based monitoring.
  - Historical alert tracking.

- 🗂️ **Session Management**
  - Stores monitoring sessions and alert history.
  - Supports long-term fatigue analysis.

- 🗄️ **Database Integration**
  - PostgreSQL database with Drizzle ORM.
  - Efficient and scalable data storage.

- ⚡ **Monorepo Architecture**
  - Managed using **pnpm workspaces**.
  - Shared dependencies and streamlined development.

---

## 🏗️ Tech Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- Node.js
- Express 5

### Database
- PostgreSQL
- Drizzle ORM

### Computer Vision & AI
- MediaPipe Face Mesh
- TensorFlow / PyTorch
- CNN + LSTM
- ResNet + LSTM
- DenseNet + LSTM

### Monorepo
- pnpm Workspaces

---

## 📂 Project Structure

```text
NeuroGuard/
│
├── apps/
│   ├── frontend/          # React + Vite application
│   └── backend/           # Express API server
│
├── packages/
│   ├── shared/            # Shared utilities and types
│   ├── ai-models/         # Deep learning models
│   └── database/          # Drizzle ORM schema and queries
│
├── datasets/              # Training datasets
├── models/                # Trained model weights
├── docs/                  # Documentation
├── pnpm-workspace.yaml
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository



### Install Dependencies

```bash
pnpm install
```

---

## 🗄️ Environment Variables

Create a `.env` file inside the backend directory:



---

## 🚀 Running the Application

### Start Backend

```bash
cd apps/backend
pnpm dev
```

Backend runs on:

```text
http://localhost:5000
```

---

### Start Frontend

```bash
cd apps/frontend
pnpm dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 🗃️ Database Setup

Generate Drizzle schema:

```bash
pnpm drizzle-kit generate
```

Run migrations:

```bash
pnpm drizzle-kit migrate
```

---

## 🧠 Deep Learning Models

### CNN + LSTM
Combines convolutional layers for spatial feature extraction with LSTM layers for temporal sequence modeling.

### ResNet + LSTM
Leverages residual networks to learn deep visual representations and LSTM layers to capture temporal dependencies.

### DenseNet + LSTM
Utilizes densely connected convolutional blocks with LSTM networks for efficient feature propagation and fatigue prediction.

---

## 📈 Fatigue Indicators

| Metric | Description |
|----------|------------|
| EAR | Measures eye openness using facial landmarks |
| PERCLOS | Percentage of eye closure over time |
| Blink Rate | Number of blinks per minute |
| Alert Level | Indicates normal, moderate, or severe fatigue |

---

## 🔔 Alert Levels

| Level | Status |
|--------|--------|
| 🟢 Normal | Healthy eye activity |
| 🟡 Moderate | Early signs of fatigue |
| 🔴 Severe | High fatigue detected |

---

## Future Enhancements

- 📱 Mobile application support
- ☁️ Cloud deployment
- 📊 Analytics dashboard
- 🤖 Personalized fatigue prediction
- ⌚ Wearable device integration
- 🌙 Sleep pattern analysis
- 📧 Email and push notifications

---

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/new-feature
```

3. Commit your changes:

```bash
git commit -m "Add new feature"
```

4. Push to the branch:

```bash
git push origin feature/new-feature
```

5. Open a Pull Request.

---

### ⭐ If you find this project useful, consider giving it a star on GitHub!
