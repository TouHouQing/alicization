import json
import pathlib
import sqlite3
import sys

profile = pathlib.Path(sys.argv[1])
if not profile.name.startswith('alicization-life-real-'):
    raise RuntimeError('Only isolated speech QA profiles are supported')
database = profile / 'alicizations' / 'cards' / 'default' / 'alicization.db'
with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as connection:
    rows = connection.execute("SELECT state, segment_id, played_ms, presentation_verified FROM life_expression_receipts WHERE state LIKE 'audio-%' AND turn_id=(SELECT json_extract(payload_ref_json,'$.turnId') FROM life_ingress WHERE kind='user-turn' ORDER BY observed_at DESC,rowid DESC LIMIT 1)").fetchall()
    text_rows = connection.execute("SELECT presentation_verified FROM life_expression_receipts WHERE state='rendered' AND turn_id=(SELECT json_extract(payload_ref_json,'$.turnId') FROM life_ingress WHERE kind='user-turn' ORDER BY observed_at DESC,rowid DESC LIMIT 1)").fetchall()
    print(json.dumps({'completed': any(state == 'audio-ended' and segment == 'utterance' and ms > 0 and verified == 1 for state, segment, ms, verified in rows), 'interrupted': any(state == 'audio-interrupted' and segment == 'utterance' and ms > 0 and verified == 1 for state, segment, ms, verified in rows), 'textPresented': any(verified == 1 for (verified,) in text_rows), 'textReceiptCount': len(text_rows), 'receipts': rows}))
