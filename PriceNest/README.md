# PriceNest - Smart Price Comparison Tool

This guide explains how to set up and run the **PriceNest** application.

## Prerequisites

1.  **Python 3.8+** installed.
2.  **PostgreSQL** installed and running.
3.  **Node.js** (Optional, but recommended for serving frontend easily via `live-server`).

---

## 1. Database Setup (PostgreSQL)

The application uses PostgreSQL. You need to create a database and configure user credentials.

1.  Open your PostgreSQL tool (pgAdmin or command line).
2.  Create a database named `pricenest`.
    ```sql
    CREATE DATABASE pricenest;
    ```
3.  By default, the app connects using:
    - **User**: `postgres`
    - **Password**: `1234`
    - **Host**: `localhost`
    - **Port**: `5432`

    **If your credentials are different**, create a `.env` file in the `PriceNest/backend` folder with your details:
    ```env
    DATABASE_USER=your_username
    DATABASE_PASSWORD=your_password
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_NAME=pricenest
    ```

---

## 2. Backend Setup

The backend is built with FastAPI.

1.  **Navigate to the project root** (`d:\PriceNest`).
2.  **Enter the inner directory**:
    The project is nested. You must be inside `PriceNest\PriceNest`.
    ```bash
    cd PriceNest
    ```
    *(Verify you are in the folder containing `backend` and `frontend`)*
3.  **Activate Virtual Environment**:
    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```
4.  **Install Dependencies**:
    ```bash
    pip install -r backend/requirements.txt
    ```
5.  **Initialize the Database**:
    This script will create the necessary tables in your `pricenest` database.
    ```bash
    python -m backend.init_db
    ```
    *Output should say: `PostgreSQL tables created ✅`*

6. ### **Terminal 1: Backend Server (With Automated Scheduler)**
First, create the database (only once), then initialize it, and finally start the server.

1.  **Create the Database** (Run once):
    ```powershell
    python backend/create_database.py
    ```
2.  **Initialize Tables** (Run once):
    ```powershell
    python -m backend.init_db
    ```
3.  **Run the Backend**:
    This will start the API server AND the background price alert scheduler automatically.
    ```powershell
    uvicorn backend.fastapi_app:app --reload
    ```
    You can check the API docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 3. Frontend Setup

The frontend consists of static HTML/JS files.

1.  **Serve the Frontend**:
    The backend allows CORS requests from `http://127.0.0.1:5500` or `http://localhost:5500`. You **must** serve the frontend on port `5500`.

    **Option A: Using VS Code Live Server (Recommended)**
    - Open the `PriceNest` folder in VS Code.
    - Right-click `frontend/index.html`.
    - Select **"Open with Live Server"**.
    - Ensure it opens on port `5500`. (If it's a different port, you may need to configure VS Code settings or update `backend/fastapi_app.py` CORS settings).

    **Option B: Using Python**
    If you don't have Live Server, you can use Python, but you### **Terminal 2: Frontend Server**
The frontend must run on port **5500**.
```powershell
cd frontend
python -m http.server 5500
```
*After this, open [http://localhost:5500](http://localhost:5500) in your browser.*

2.  **Access the App**:
    Open [http://127.0.0.1:5500/index.html](http://127.0.0.1:5500/index.html) in your browser.

---

    python -m backend.scheduler_worker
    ```

---

## Project Structure

- **backend/**: Contains FastAPI app, database models, and scraper logic.
  - `fastapi_app.py`: Main API entry point.
  - `backend_scrapper.py`: Logic to scrape Google Shopping results.
  - `database.py`: Database connection string.
- **frontend/**: Contains HTML, CSS, and JS files.
  - `js/api.js`: Configures the API base URL (`http://127.0.0.1:8000`).

## Notes

- **SerpApi Key**: The project uses a hardcoded SerpApi key in `backend_scrapper.py`. If you hit rate limits, you may need to replace it with your own key from [SerpApi](https://serpapi.com/).
- **Email Alerts**: The email sender credentials are currently hardcoded in `scheduler_worker.py`. For production use, use environment variables.
