from copy import deepcopy


ENTRY_POOL = {
    "E-R01": {
        "entry_id": "E-R01", "type": "invoice", "vendor_id": "VEND-0042", "amount": 240.00,
        "raw_text": "Cloudspan monthly platform fee, May. Invoice CS-1842.", "arrival_t": 8,
        "_case_signature": "invoice|P-04",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-CA-07", "disposition": "auto-post"},
    },
    "E-R02": {
        "entry_id": "E-R02", "type": "notification", "vendor_id": "VEND-0055", "amount": 89.00,
        "raw_text": "Duplicate invoice alert for DeskNest DN-2011.", "arrival_t": 15,
        "_case_signature": "notification|dupe",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-NY-01", "disposition": "duplicate-review"},
    },
    "E-R03": {
        "entry_id": "E-R03", "type": "invoice", "vendor_id": "VEND-0088", "amount": 816.40,
        "raw_text": "Meridian Travel team dinner and rail expense.", "arrival_t": 23,
        "_case_signature": "invoice|P-11",
        "_ground_truth": {"gl_code": "GL-5510", "state_code": "ST-NY-01", "disposition": "meals-review"},
    },
    "E-R04": {
        "entry_id": "E-R04", "type": "invoice", "vendor_id": "VEND-0061", "amount": 428.00,
        "raw_text": "Relay Comms monthly telephony service, May.", "arrival_t": 32,
        "_case_signature": "invoice|P-04",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-CA-07", "disposition": "auto-post"},
    },
    "E-HERO": {
        "entry_id": "E-HERO", "type": "invoice", "vendor_id": "VEND-0042", "amount": 28800.00,
        "raw_text": "Cloudspan annual prepay, 12-mo term, paid in full. Contract CS-2026-A.", "arrival_t": 40,
        "_case_signature": "invoice|P-04-CAPEX",
        "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-CA-07", "disposition": "capitalize"},
    },
    "E-R05": {
        "entry_id": "E-R05", "type": "expense", "vendor_id": "VEND-0090", "amount": 5400.00,
        "raw_text": "Beacon Contractors implementation milestone payment.", "arrival_t": 50,
        "_case_signature": "expense|P-22",
        "_ground_truth": {"gl_code": "GL-6200", "state_code": "ST-TX-03", "disposition": "1099-reportable"},
    },
    "E-R06": {
        "entry_id": "E-R06", "type": "invoice", "vendor_id": "VEND-0055", "amount": 126.00,
        "raw_text": "DeskNest monthly workspace subscription, June.", "arrival_t": 56,
        "_case_signature": "invoice|P-04",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-NY-01", "disposition": "auto-post"},
    },
    "E-R07": {
        "entry_id": "E-R07", "type": "invoice", "vendor_id": "VEND-0102", "amount": 3200.00,
        "raw_text": "Ironside Legal contract review services.", "arrival_t": 63,
        "_case_signature": "invoice|P-30",
        "_ground_truth": {"gl_code": "GL-6410", "state_code": "ST-NY-01", "disposition": "auto-post"},
    },
    "E-H03": {
        "entry_id": "E-H03", "type": "invoice", "vendor_id": "VEND-0061", "amount": 9600.00,
        "raw_text": "Relay Comms yearly contract, paid in full.", "arrival_t": 70,
        "_case_signature": "invoice|P-04-CAPEX",
        "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-CA-07", "disposition": "capitalize"},
    },
    "E-R08": {
        "entry_id": "E-R08", "type": "notification", "vendor_id": "VEND-0042", "amount": 240.00,
        "raw_text": "Duplicate invoice alert for Cloudspan CS-1842.", "arrival_t": 76,
        "_case_signature": "notification|dupe",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-CA-07", "disposition": "duplicate-review"},
    },
    "E-R09": {
        "entry_id": "E-R09", "type": "recon", "vendor_id": "VEND-0042", "amount": 1400.00,
        "raw_text": "Cloudspan usage allocation across NY and CA entities.", "arrival_t": 83,
        "_case_signature": "recon|multistate",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-CA-07", "disposition": "split-review"},
    },
    "E-R10": {
        "entry_id": "E-R10", "type": "invoice", "vendor_id": "VEND-0042", "amount": 252.00,
        "raw_text": "Cloudspan monthly platform fee, June.", "arrival_t": 91,
        "_case_signature": "invoice|P-04",
        "_ground_truth": {"gl_code": "GL-4021", "state_code": "ST-CA-07", "disposition": "auto-post"},
    },
    "E-R11": {
        "entry_id": "E-R11", "type": "expense", "vendor_id": "VEND-0090", "amount": 2200.00,
        "raw_text": "Beacon Contractors final sprint payment.", "arrival_t": 98,
        "_case_signature": "expense|P-22",
        "_ground_truth": {"gl_code": "GL-6200", "state_code": "ST-TX-03", "disposition": "1099-reportable"},
    },
}


HELD_OUT = {
    "invoice|P-04-CAPEX": [
        {
            "entry_id": "E-H01", "type": "invoice", "vendor_id": "VEND-0042", "amount": 24000.00,
            "raw_text": "Cloudspan annual prepay, 12-mo term.", "arrival_t": None,
            "_case_signature": "invoice|P-04-CAPEX",
            "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-CA-07", "disposition": "capitalize"},
        },
        {
            "entry_id": "E-H02", "type": "invoice", "vendor_id": "VEND-0055", "amount": 18000.00,
            "raw_text": "DeskNest prepaid 24 months upfront.", "arrival_t": None,
            "_case_signature": "invoice|P-04-CAPEX",
            "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-NY-01", "disposition": "capitalize"},
        },
        deepcopy(ENTRY_POOL["E-H03"]),
        {
            "entry_id": "E-H04", "type": "invoice", "vendor_id": "VEND-0042", "amount": 31200.00,
            "raw_text": "Cloudspan multi-year, invoiced annually.", "arrival_t": None,
            "_case_signature": "invoice|P-04-CAPEX",
            "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-CA-07", "disposition": "capitalize"},
        },
        {
            "entry_id": "E-H05", "type": "invoice", "vendor_id": "VEND-0055", "amount": 12000.00,
            "raw_text": "DeskNest 12-month prepaid subscription.", "arrival_t": None,
            "_case_signature": "invoice|P-04-CAPEX",
            "_ground_truth": {"gl_code": "GL-4890", "state_code": "ST-NY-01", "disposition": "capitalize"},
        },
    ]
}


ARRIVAL_SCHEDULE = [
    {"t_seconds": 8, "entry_id": "E-R01"},
    {"t_seconds": 15, "entry_id": "E-R02"},
    {"t_seconds": 23, "entry_id": "E-R03"},
    {"t_seconds": 32, "entry_id": "E-R04"},
    {"t_seconds": 40, "entry_id": "E-HERO"},
    {"t_seconds": 50, "entry_id": "E-R05"},
    {"t_seconds": 56, "entry_id": "E-R06"},
    {"t_seconds": 63, "entry_id": "E-R07"},
    {"t_seconds": 70, "entry_id": "E-H03"},
    {"t_seconds": 76, "entry_id": "E-R08"},
    {"t_seconds": 83, "entry_id": "E-R09"},
    {"t_seconds": 91, "entry_id": "E-R10"},
    {"t_seconds": 98, "entry_id": "E-R11"},
]


def held_out_for(signature: str):
    return deepcopy(HELD_OUT.get(signature, []))
