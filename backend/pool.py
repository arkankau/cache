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
    "E-RUSH": {
        "entry_id": "E-RUSH", "type": "expense", "vendor_id": "VEND-0090", "amount": 8750.00,
        "raw_text": "Beacon Contractors same-day release requested for production recovery work.", "arrival_t": 12,
        "_case_signature": "expense|P-22-RUSH",
        "_ground_truth": {"gl_code": "GL-6200", "state_code": "ST-TX-03", "disposition": "expedite-review"},
    },
    "E-RUSH-REPEAT": {
        "entry_id": "E-RUSH-REPEAT", "type": "expense", "vendor_id": "VEND-0090", "amount": 4100.00,
        "raw_text": "Urgent release for Beacon Contractors; expedite payment today.", "arrival_t": 17,
        "_case_signature": "expense|P-22-RUSH",
        "_ground_truth": {"gl_code": "GL-6200", "state_code": "ST-TX-03", "disposition": "expedite-review"},
    },
    "E-RETAINER": {
        "entry_id": "E-RETAINER", "type": "invoice", "vendor_id": "VEND-0102", "amount": 15000.00,
        "raw_text": "Ironside Legal quarterly retainer paid in advance for regulatory counsel.", "arrival_t": 21,
        "_case_signature": "invoice|P-30-RETAINER",
        "_ground_truth": {"gl_code": "GL-6410", "state_code": "ST-NY-01", "disposition": "retainer-review"},
    },
    "E-RETAINER-REPEAT": {
        "entry_id": "E-RETAINER-REPEAT", "type": "invoice", "vendor_id": "VEND-0102", "amount": 7500.00,
        "raw_text": "Prepaid legal retainer for the upcoming contract cycle.", "arrival_t": 27,
        "_case_signature": "invoice|P-30-RETAINER",
        "_ground_truth": {"gl_code": "GL-6410", "state_code": "ST-NY-01", "disposition": "retainer-review"},
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
    ],
    "expense|P-22-RUSH": [
        {
            "entry_id": f"E-RH0{index}", "type": "expense", "vendor_id": "VEND-0090",
            "amount": 3000.00 + index * 425,
            "raw_text": text, "arrival_t": None,
            "_case_signature": "expense|P-22-RUSH",
            "_ground_truth": {"gl_code": "GL-6200", "state_code": "ST-TX-03", "disposition": "expedite-review"},
        }
        for index, text in enumerate(
            (
                "Same-day contractor payment after outage recovery.",
                "Rush release for implementation support.",
                "Expedite contractor milestone today.",
                "Urgent release for production remediation.",
                "Same-day Beacon services settlement.",
            ),
            start=1,
        )
    ],
    "invoice|P-30-RETAINER": [
        {
            "entry_id": f"E-LH0{index}", "type": "invoice", "vendor_id": "VEND-0102",
            "amount": 5000.00 + index * 1000,
            "raw_text": text, "arrival_t": None,
            "_case_signature": "invoice|P-30-RETAINER",
            "_ground_truth": {"gl_code": "GL-6410", "state_code": "ST-NY-01", "disposition": "retainer-review"},
        }
        for index, text in enumerate(
            (
                "Quarterly legal retainer paid in advance.",
                "Prepaid legal counsel retainer.",
                "Advance legal services retainer for July.",
                "Ironside annual retainer installment.",
                "Prepaid legal advisory retainer.",
            ),
            start=1,
        )
    ],
}


ARRIVAL_SCHEDULE = [
    {"t_seconds": 1.0, "entry_id": "E-R01"},
    {"t_seconds": 2.5, "entry_id": "E-R02"},
    {"t_seconds": 4.0, "entry_id": "E-HERO"},
    {"t_seconds": 6.5, "entry_id": "E-R03"},
    {"t_seconds": 8.5, "entry_id": "E-H03"},
    {"t_seconds": 10.0, "entry_id": "E-R04"},
    {"t_seconds": 12.0, "entry_id": "E-RUSH"},
    {"t_seconds": 14.5, "entry_id": "E-R05"},
    {"t_seconds": 17.0, "entry_id": "E-RUSH-REPEAT"},
    {"t_seconds": 18.5, "entry_id": "E-R06"},
    {"t_seconds": 21.0, "entry_id": "E-RETAINER"},
    {"t_seconds": 23.5, "entry_id": "E-R08"},
    {"t_seconds": 27.0, "entry_id": "E-RETAINER-REPEAT"},
    {"t_seconds": 29.0, "entry_id": "E-R09"},
    {"t_seconds": 31.0, "entry_id": "E-R10"},
    {"t_seconds": 33.0, "entry_id": "E-R11"},
]


def held_out_for(signature: str):
    return deepcopy(HELD_OUT.get(signature, []))
