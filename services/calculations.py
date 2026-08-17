import math

def calculate_gmp_metrics(issue_price, max_price, gmp_amount, lot_size):
    """
    Calculates GMP Listing Price, Profit per lot, and percentage return.
    """
    upper_price = max_price if (max_price and max_price > 0) else (issue_price if issue_price else 0)
    
    if upper_price <= 0:
        return {
            'upper_price': 0,
            'gmp_amount': gmp_amount,
            'estimated_listing_price': 0,
            'estimated_profit_per_lot': 0,
            'gmp_percent': 0
        }
    
    estimated_listing_price = upper_price + gmp_amount
    estimated_profit_per_lot = gmp_amount * lot_size
    gmp_percent = (gmp_amount / upper_price) * 100.0
    
    return {
        'upper_price': round(upper_price, 2),
        'gmp_amount': round(gmp_amount, 2),
        'estimated_listing_price': round(estimated_listing_price, 2),
        'estimated_profit_per_lot': round(estimated_profit_per_lot, 2),
        'gmp_percent': round(gmp_percent, 2)
    }

def calculate_allotment_probability(issue_size_cr, retail_quota_percent, lot_size, upper_price, subscription_x, category='Retail (RII)', lots_applied=1):
    """
    Estimates allotment probability for retail lottery and NII proportional distribution.
    """
    if upper_price <= 0 or lot_size <= 0:
        return {
            'probability_percent': 0,
            'chance_ratio': '0 in 1',
            'explanation': 'Invalid price or lot size input.',
            'category': category
        }
    
    lot_cost = upper_price * lot_size
    total_retail_shares = (issue_size_cr * 10000000 * (retail_quota_percent / 100.0))
    total_retail_lots_available = math.floor(total_retail_shares / lot_size)
    
    if category.startswith('Retail') or category.startswith('RII'):
        # In Indian IPO retail quota, if oversubscribed (subscription_x > 1.0), allotment is via computer lottery:
        # Each successful valid applicant gets at most 1 lot.
        if subscription_x <= 1.0:
            prob = 100.0
            ratio = "1 in 1 (Guaranteed 1+ lots)"
            explanation = "Retail category is undersubscribed or fully covered. All valid retail applicants will receive at least 1 lot."
        else:
            # Probability per applicant = 1 / subscription_x
            prob = (1.0 / subscription_x) * 100.0
            prob = min(prob, 100.0)
            ratio = f"1 in {round(subscription_x, 1)}"
            explanation = f"Retail quota is oversubscribed by {subscription_x:.2f}x. SEBI computer lottery determines allotment. Applying for more lots under the same PAN does not increase retail winning chances."
    elif category.startswith('Small NII') or category.startswith('sNII'):
        # sNII (2 Lakhs to 10 Lakhs)
        if subscription_x <= 1.0:
            prob = 100.0
            ratio = "1 in 1 (Guaranteed Allotment)"
            explanation = "sNII quota is undersubscribed. Full lot allotment guaranteed."
        else:
            prob = (1.0 / subscription_x) * 100.0
            ratio = f"1 in {round(subscription_x, 1)}"
            explanation = f"sNII quota oversubscribed by {subscription_x:.2f}x. Lottery draw assigns min sNII lot size."
    else:
        # Big NII / QIB
        if subscription_x <= 1.0:
            prob = 100.0
            ratio = "1 in 1 (Full Proportional Allotment)"
            explanation = "Category is undersubscribed. Proportional allotment guaranteed."
        else:
            prob = (1.0 / subscription_x) * 100.0
            ratio = f"Proportional ({round(100.0 / subscription_x, 1)}% of bid)"
            explanation = f"Proportional allotment based on total bid amount vs category oversubscription multiple ({subscription_x:.2f}x)."
            
    return {
        'probability_percent': round(prob, 2),
        'chance_ratio': ratio,
        'explanation': explanation,
        'category': category,
        'lots_applied': lots_applied,
        'estimated_allotted_lots': 1 if (prob >= 100 or (prob > 0 and category.startswith('Retail'))) else 0
    }
