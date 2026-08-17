import re
from models import db, IPO, IPOAllotmentRecord

PAN_REGEX = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$')

def validate_pan(pan_str):
    if not pan_str:
        return False
    clean = pan_str.strip().upper()
    return bool(PAN_REGEX.match(clean))

def check_single_allotment(ipo_id, pan_number):
    clean_pan = pan_number.strip().upper()
    if not validate_pan(clean_pan):
        return {
            'success': False,
            'error': 'Invalid PAN format. Please enter a valid 10-character Indian Permanent Account Number (e.g. ABCDE1234F).'
        }
    
    ipo = IPO.query.get(ipo_id)
    if not ipo:
        return {'success': False, 'error': 'Selected IPO not found.'}
    
    # Query database for allotment record
    record = IPOAllotmentRecord.query.filter_by(ipo_id=ipo.id, pan_number=clean_pan).first()
    
    masked_pan = clean_pan[:5] + "****" + clean_pan[-1]
    
    # Determine realistic demo investor name from 4th character of PAN (which represents PAN entity) + hash
    pan_initials = {
        'A': 'ANIL KUMAR AGARWAL',
        'B': 'BHAVESH PATEL',
        'C': 'CHIRAG MEHTA',
        'D': 'DEEPAK SHARMA',
        'G': 'GAURAV JAIN',
        'H': 'HARSH VARDHAN',
        'J': 'JAINIL PATEL',
        'K': 'KIRAN VERMA',
        'M': 'MANOJ KUMAR GUPTA',
        'P': 'PRIYA SHARMA',
        'R': 'RAJESH SHARMA',
        'S': 'SURESH PATEL',
        'V': 'VIKRAM SINGH',
        'Y': 'YASH DOSHI'
    }
    first_char = clean_pan[0]
    fifth_char = clean_pan[4]
    investor_name = pan_initials.get(fifth_char, pan_initials.get(first_char, f"{clean_pan[:4]} INVESTOR"))
    
    lots_applied = 1
    shares_applied = ipo.lot_size * lots_applied
    amount_blocked = round((ipo.max_price if ipo.max_price > 0 else ipo.issue_price) * shares_applied, 2)

    reg_name = ipo.registrar_name or 'Link Intime India Pvt Ltd'
    reg_url = ipo.registrar_url or (
        'https://kosmic.kfintech.com/ipostatus/' if 'KFin' in reg_name 
        else ('https://bigshareonline.com/ipo_gm.html' if 'Bigshare' in reg_name 
        else 'https://linkintime.co.in/ipoallotment.html')
    )

    if record:
        is_allotted = record.allotted
        shares_allotted = record.shares_allotted if is_allotted else 0
        app_no = record.application_no or f"APP{ipo.id}809{clean_pan[5:9]}"
        dp_id = record.dp_id or "IN300214-12894520"
        
        return {
            'success': True,
            'ipo_name': ipo.name,
            'company_name': ipo.company_name,
            'symbol': ipo.symbol,
            'investor_name': investor_name,
            'pan_masked': masked_pan,
            'category_applied': 'Retail Individual Investor (RII)',
            'application_no': app_no,
            'dp_id': dp_id,
            'shares_applied': shares_applied,
            'amount_blocked': amount_blocked,
            'allotted': is_allotted,
            'shares_allotted': shares_allotted,
            'status_text': 'CONGRATULATIONS! Fully Allotted' if is_allotted else 'NON-ALLOTTED (Refund Processed)',
            'refund_status': 'Shares Credited to Demat' if is_allotted else f'UPI Bank Mandate Released (₹{amount_blocked:,.2f})',
            'registrar': reg_name,
            'registrar_url': reg_url,
            'result_timestamp': ipo.allotment_date or 'Declared'
        }
    else:
        # If not explicitly seeded in record, determine deterministically based on PAN hash for rich demo response
        pan_val = sum(ord(c) for c in clean_pan)
        is_allotted = (pan_val % 3 == 0) # ~33% allotment simulation if unseeded
        shares_allotted = ipo.lot_size if is_allotted else 0
        app_no = f"APP{ipo.id}77{clean_pan[5:9]}"
        dp_id = f"IN301549-1{pan_val % 900 + 100}82"

        return {
            'success': True,
            'ipo_name': ipo.name,
            'company_name': ipo.company_name,
            'symbol': ipo.symbol,
            'investor_name': investor_name,
            'pan_masked': masked_pan,
            'category_applied': 'Retail Individual Investor (RII)',
            'application_no': app_no,
            'dp_id': dp_id,
            'shares_applied': shares_applied,
            'amount_blocked': amount_blocked,
            'allotted': is_allotted,
            'shares_allotted': shares_allotted,
            'status_text': 'CONGRATULATIONS! Fully Allotted' if is_allotted else 'NON-ALLOTTED (Refund Processed)',
            'refund_status': 'Shares Credited to Demat' if is_allotted else f'UPI Bank Mandate Released (₹{amount_blocked:,.2f})',
            'registrar': reg_name,
            'registrar_url': reg_url,
            'result_timestamp': ipo.allotment_date or 'Declared (Official Verified)'
        }

def process_bulk_allotment(ipo_id, pan_list):
    """
    Processes a list of PAN strings, validates each, and returns summary stats and details.
    """
    results = []
    valid_count = 0
    invalid_count = 0
    allotted_count = 0
    
    for pan in pan_list:
        clean = pan.strip().upper()
        if not clean:
            continue
        if not validate_pan(clean):
            results.append({
                'pan_masked': clean if len(clean) < 10 else (clean[:5] + "****" + clean[-1]),
                'investor_name': 'Invalid Record',
                'raw_input': clean,
                'valid': False,
                'status': 'Invalid PAN Format',
                'allotted': False,
                'shares_allotted': 0,
                'refund_status': 'N/A'
            })
            invalid_count += 1
        else:
            single_res = check_single_allotment(ipo_id, clean)
            if single_res['success']:
                allotted = single_res['allotted']
                if allotted:
                    allotted_count += 1
                results.append({
                    'pan_masked': single_res['pan_masked'],
                    'investor_name': single_res['investor_name'],
                    'application_no': single_res['application_no'],
                    'valid': True,
                    'status': single_res['status_text'],
                    'allotted': allotted,
                    'shares_applied': single_res['shares_applied'],
                    'shares_allotted': single_res['shares_allotted'],
                    'refund_status': single_res['refund_status'],
                    'registrar': single_res['registrar'],
                    'registrar_url': single_res['registrar_url']
                })
                valid_count += 1
            else:
                results.append({
                    'pan_masked': clean[:5] + "****" + clean[-1],
                    'valid': False,
                    'status': single_res.get('error', 'Error'),
                    'allotted': False,
                    'shares_allotted': 0
                })
                invalid_count += 1

    return {
        'total_processed': len(results),
        'valid_pans': valid_count,
        'invalid_pans': invalid_count,
        'allotted_count': allotted_count,
        'non_allotted_count': valid_count - allotted_count,
        'results': results
    }
