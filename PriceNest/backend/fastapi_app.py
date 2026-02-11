import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

from backend.backend_scrapper import compare_product

from .analytics_engine import analyze_price
from . import storage
from .auth_utils import get_password_hash, verify_password


# -----------------------
# Logging
# -----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pricenest")


# -----------------------
# FastAPI App
# -----------------------
app = FastAPI(
    title="PriceNest API",
    description="Smart Price Comparison & Analytics API",
    version="1.0.0"
)

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.base import JobLookupError
from backend.scheduler_worker import check_alerts_job
from fastapi import BackgroundTasks

scheduler = BackgroundScheduler()

@app.on_event("startup")
def start_scheduler():
    try:
        scheduler.add_job(
            check_alerts_job, 
            "interval", 
            minutes=1, 
            id="price_alert_checker", 
            replace_existing=True
        )
        scheduler.start()
        logger.info("Scheduler started automatically with job 'price_alert_checker'.")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler shut down.")

@app.post("/debug/trigger-alerts")
def trigger_alerts_manually(background_tasks: BackgroundTasks):
    logger.info("[MANUAL TRIGGER] Checking alerts...")
    background_tasks.add_task(check_alerts_job)
    return {"status": "ok", "message": "Alert check triggered in background"}


# -----------------------
# CORS CONFIG
# -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------
# Data Models
# -----------------------
class CompareResponse(BaseModel):
    query: str
    results: List[dict]


class AlertRequest(BaseModel):
    email: str
    query: str
    target_price: int
    notify_method: Optional[str] = "email"


class UserSignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class UserLoginRequest(BaseModel):
    email: str
    password: str


class WishlistRequest(BaseModel):
    email: str
    product_id: int


# -----------------------
# Thread Pool
# -----------------------
EXECUTOR = ThreadPoolExecutor(max_workers=4)
SCRAPER_TIMEOUT = 12


# -----------------------------------------------------------
# /compare
# -----------------------------------------------------------
@app.get("/compare", response_model=CompareResponse)
def compare(q: str):
    q = q.strip().lower()
    logger.info(f"[COMPARE] {q}")

    future = EXECUTOR.submit(compare_product, q)

    try:
        data = future.result(timeout=SCRAPER_TIMEOUT)
    except FuturesTimeout:
        raise HTTPException(status_code=504, detail="Scraper timed out")
    except Exception as e:
        logger.exception("Scraper error")
        raise HTTPException(status_code=500, detail=str(e))

    try:
        results = storage.upsert_product(q, data.get("results", []))
        return {"query": q, "results": results}
    except Exception:
        logger.exception("Failed to save product data")
        return data


# -----------------------------------------------------------
# /alerts
# -----------------------------------------------------------
@app.post("/alerts")
def create_alert(req: AlertRequest):
    query = req.query.strip().lower()
    logger.info(f"[ALERT] {query}")

    if not storage.get_product(query):
        fresh = compare_product(query)
        storage.upsert_product(query, fresh.get("results", []))

    alert = storage.add_alert(
        email=req.email,
        query=query,
        target_price=req.target_price,
        notify_method=req.notify_method
    )

    return {"status": "ok", "alert": alert}


@app.get("/alerts")
def get_alerts():
    return storage.list_alerts()


@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int):
    success = storage.delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "ok", "message": "Alert deleted"}


@app.patch("/alerts/{alert_id}/toggle")
def toggle_alert(alert_id: int):
    new_status = storage.toggle_alert_status(alert_id)
    return {"status": "ok", "is_active": new_status}


# -----------------------------------------------------------
# /history (debug)
# -----------------------------------------------------------
@app.get("/history")
def get_history(q: str):
    q = q.strip().lower()
    history = storage.get_price_history(q)

    if not history:
        raise HTTPException(status_code=404, detail="No price history available")

    return {"query": q, "history": history}


# -----------------------------------------------------------
# /analytics
# -----------------------------------------------------------
@app.get("/analytics")
def analytics(q: str):
    q = q.strip().lower()
    logger.info(f"[ANALYTICS] {q}")

    result = analyze_price(q)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# -----------------------------------------------------------
# Auth Endpoints
# -----------------------------------------------------------
@app.post("/auth/signup")
def signup(req: UserSignupRequest):
    logger.info(f"[SIGNUP] {req.email}")
    
    # Check if user already exists
    existing_user = storage.get_user_by_email(req.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(req.password)
    user = storage.create_user(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        hashed_password=hashed_password
    )
    
    return {
        "status": "ok",
        "user": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email
        }
    }


@app.post("/auth/login")
def login(req: UserLoginRequest):
    logger.info(f"[LOGIN] {req.email}")
    
    user = storage.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "status": "ok",
        "user": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email
        }
    }

# -----------------------------------------------------------
# Wishlist Endpoints
# -----------------------------------------------------------
@app.post("/wishlist")
def add_to_wishlist(req: WishlistRequest):
    logger.info(f"[WISHLIST ADD] {req.email} -> {req.product_id}")
    item = storage.add_to_wishlist(req.email, req.product_id)
    if not item:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "message": "Product added to wishlist"}


@app.delete("/wishlist")
def remove_from_wishlist(req: WishlistRequest):
    logger.info(f"[WISHLIST REMOVE] {req.email} -> {req.product_id}")
    success = storage.remove_from_wishlist(req.email, req.product_id)
    if not success:
        raise HTTPException(status_code=404, detail="User or wishlist item not found")
    return {"status": "ok", "message": "Product removed from wishlist"}


@app.get("/wishlist")
def get_wishlist(email: str):
    logger.info(f"[WISHLIST GET] {email}")
    items = storage.get_wishlist(email)
    return {"status": "ok", "wishlist": items}
