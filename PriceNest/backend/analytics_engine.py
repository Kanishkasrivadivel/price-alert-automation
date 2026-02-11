import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import SessionLocal
from .models import PriceHistory


# ---------------------------------------------------------
# Fetch Price History from PostgreSQL (CASE-INSENSITIVE)
# ---------------------------------------------------------
def fetch_price_history(query: str) -> pd.DataFrame:
    db: Session = SessionLocal()
    query = query.strip().lower()

    rows = (
        db.query(
            PriceHistory.source,
            PriceHistory.price,
            PriceHistory.timestamp
        )
        .filter(func.lower(PriceHistory.query) == query)   # 🔥 KEY FIX
        .order_by(PriceHistory.timestamp)
        .all()
    )

    db.close()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["store", "price", "timestamp"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


# ---------------------------------------------------------
# Main Analytics Engine
# ---------------------------------------------------------
def analyze_price(query: str):
    df = fetch_price_history(query)

    if df.empty or len(df) < 2:
        return {"error": "Not enough price history available"}

    lowest_price = int(df["price"].min())
    highest_price = int(df["price"].max())
    avg_price = int(df["price"].mean())

    cheapest_store = df.loc[df["price"].idxmin()]["store"]

    latest_prices = (
        df.sort_values("timestamp")
        .groupby("store")
        .last()
        .reset_index()
    )

    store_prices = {
        row["store"]: int(row["price"])
        for _, row in latest_prices.iterrows()
    }

    price_trend = df.to_dict(orient="records")

    volatility_score = round(df["price"].std(), 2)

    if volatility_score < 500:
        stability = "🟢 Stable"
    elif volatility_score < 1500:
        stability = "🟡 Moderate"
    else:
        stability = "🔴 Highly Volatile"

    insight = "Not enough recent data"
    recent = df[df["timestamp"] >= datetime.utcnow() - timedelta(days=7)]

    if len(recent) >= 2:
        diff = int(recent.iloc[-1]["price"] - recent.iloc[0]["price"])
        if diff < 0:
            insight = f"Prices dropped by ₹{abs(diff)} in the last 7 days"
        elif diff > 0:
            insight = f"Prices increased by ₹{diff} in the last 7 days"
        else:
            insight = "Prices remained stable in the last 7 days"

    cheapest_per_timestamp = (
        df.sort_values("price")
        .groupby("timestamp")
        .first()
    )

    store_consistency = (
        cheapest_per_timestamp
        .groupby("store")
        .size()
        .to_dict()
    )

    return {
        "summary": {
            "lowest_price": lowest_price,
            "highest_price": highest_price,
            "average_price": avg_price,
            "price_range": f"₹{lowest_price} – ₹{highest_price}",
            "cheapest_store": cheapest_store
        },
        "store_prices": store_prices,
        "price_trend": price_trend,
        "volatility": {
            "score": volatility_score,
            "stability": stability
        },
        "best_time_to_buy": insight,
        "store_consistency": store_consistency
    }
