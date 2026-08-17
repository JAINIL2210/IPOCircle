import pytest
from services.calculations import calculate_gmp_metrics, calculate_allotment_probability
from services.allotment_service import validate_pan

def test_calculate_gmp_metrics():
    # Issue price 338, max price 338, GMP 115, lot size 44
    res = calculate_gmp_metrics(issue_price=338, max_price=338, gmp_amount=115, lot_size=44)
    assert res['upper_price'] == 338.0
    assert res['gmp_amount'] == 115.0
    assert res['estimated_listing_price'] == 453.0  # 338 + 115
    assert res['estimated_profit_per_lot'] == 5060.0 # 115 * 44
    assert round(res['gmp_percent'], 2) == 34.02     # (115 / 338) * 100

def test_validate_pan():
    assert validate_pan("ABCDE1234F") is True
    assert validate_pan("pqrst5678g") is True
    assert validate_pan("INVALID123") is False
    assert validate_pan("ABCDE12345") is False
    assert validate_pan("") is False

def test_calculate_allotment_probability_retail():
    # Retail lottery oversubscribed by 10x
    res = calculate_allotment_probability(
        issue_size_cr=1000,
        retail_quota_percent=35,
        lot_size=44,
        upper_price=338,
        subscription_x=10.0,
        category='Retail (RII)',
        lots_applied=1
    )
    assert res['probability_percent'] == 10.0
    assert "1 in 10" in res['chance_ratio']

def test_calculate_allotment_probability_undersubscribed():
    res = calculate_allotment_probability(
        issue_size_cr=1000,
        retail_quota_percent=35,
        lot_size=44,
        upper_price=338,
        subscription_x=0.8,
        category='Retail (RII)',
        lots_applied=1
    )
    assert res['probability_percent'] == 100.0
